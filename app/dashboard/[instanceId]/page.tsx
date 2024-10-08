"use client";
import { useEffect, useState, useCallback } from "react";
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ConnectionLineType,
  useReactFlow,
  Node as FlowNode,
  Edge,
} from "reactflow";

import "reactflow/dist/style.css";
import YesNoNode from "@/components/dashboard/yesNoNode";
import SingleChoiceNode from "@/components/dashboard/singleChoiceNode";
import MultipleChoiceNode from "@/components/dashboard/multipleChoiceNode";
import EndNode from "@/components/dashboard/endNode";
import StartNode from "@/components/dashboard/startNode";
import EditableEdge from "@/components/dashboard/editableEdge";
import WeightNode from "@/components/dashboard/weightNode";
import FunctionNode from "@/components/dashboard/functionNode";
import useStore, { ChartInstance } from "@/lib/store";
import { Settings, Trash } from "lucide-react";
import { Toaster, toast } from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import UtilityModal from "@/components/utilityModal";

const nodeTypes = {
  yesNo: YesNoNode,
  singleChoice: SingleChoiceNode,
  multipleChoice: MultipleChoiceNode,
  endNode: EndNode,
  startNode: StartNode,
  weightNode: WeightNode,
  functionNode: FunctionNode,
};

const edgeTypes = {
  editableEdge: EditableEdge,
};

const InstancePage = ({ params }: { params: { instanceId: string } }) => {
  const {
    chartInstances,
    setNodesAndEdges,
    setCurrentTabColor,
    setOnePage,
    deleteTab,
    currentTab,
    setCurrentTab,
    setChartInstance,
    updateChartInstanceName,
    variables,
    setVariables,
  } = useStore((state) => ({
    chartInstances: state.chartInstances,
    setNodesAndEdges: state.setNodesAndEdges,
    setCurrentTabColor: state.setCurrentTabColor,
    setOnePage: state.setOnePage,
    deleteTab: state.deleteTab,
    currentTab: state.currentTab,
    setCurrentTab: state.setCurrentTab,
    setChartInstance: state.setChartInstance,
    updateChartInstanceName: state.updateChartInstanceName,
    variables: state.variables,
    setVariables: state.setVariables,
  }));

  const [currentInstance, setCurrentInstance] = useState<ChartInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [newColor, setNewColor] = useState("#80B500");
  const [onePageMode, setOnePageMode] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [selectedVersion, setSelectedVersion] = useState("");
  const [selectedGlobalVersion, setSelectedGlobalVersion] = useState("");
  const [activeTab, setActiveTab] = useState("local");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [localVariables, setLocalVariables] = useState(variables.local || []);
  const [globalVariables, setGlobalVariables] = useState(variables.global || []);
  const [newVariableName, setNewVariableName] = useState("");
  const [newVariableValue, setNewVariableValue] = useState("");
  const [tabToDelete, setTabToDelete] = useState<ChartInstance | null>(null);

  const { project } = useReactFlow();

  const updateNodesWithLogic = (
    nodes: FlowNode[],
    edges: Edge[],
    allCharts: ChartInstance[]
  ) => {
    return nodes.map((node) => {
      const connectedEdges = edges.filter(
        (edge) => edge.source === node.id || edge.target === node.id
      );

      if (node.type === "weightNode") {
        const nextEdge = connectedEdges.find((edge) => edge.source === node.id);
        node.data.nextNodeId = nextEdge ? nextEdge.target : null;
        node.data.options = [
          {
            label: "DEFAULT",
            nextNodeId: nextEdge ? nextEdge.target : null,
          },
        ];
      } else if (node.type === "yesNo") {
        delete node.data.endType;
        delete node.data.redirectTab;
        delete node.data.weight;

        node.data.options = node.data.options.map((option: any) => {
          const correspondingEdge = connectedEdges.find(
            (edge) =>
              edge.source === node.id && edge.sourceHandle === option.label
          );
          return {
            ...option,
            nextNodeId: correspondingEdge ? correspondingEdge.target : null,
          };
        });
      } else if (node.type === "singleChoice") {
        node.data.options = node.data.options.map((option: any) => ({
          ...option,
          id: option.id || uuidv4(),
        }));

        node.data.options = node.data.options.map((option: any) => {
          const correspondingEdge = connectedEdges.find(
            (edge) =>
              edge.source === node.id &&
              edge.sourceHandle === `SCN-${node.id}-${option.id}-next`
          );
          return {
            ...option,
            nextNodeId: correspondingEdge ? correspondingEdge.target : null,
          };
        });
      } else if (node.type === "multipleChoice") {
        node.data.options = node.data.options.map((option: any) => ({
          ...option,
          id: option.id || uuidv4(),
          nextNodeId: "-1",
        }));

        node.data.options = node.data.options.filter(
          (option: any) => option.label !== "DEFAULT"
        );

        const nextEdge = connectedEdges.find((edge) => edge.source === node.id);
        node.data.options.push({
          label: "DEFAULT",
          nextNodeId: nextEdge ? nextEdge.target : null,
        });
      } else if (node.type === "endNode") {
        if (node.data.endType === "redirect") {
          const targetChart = allCharts.find(
            (chart) => chart.name === node.data.redirectTab
          );
          if (targetChart) {
            const startNode = targetChart.initialNodes.find(
              (n) => n.type === "startNode"
            );
            if (startNode) {
              node.data.nextNodeId = startNode.id;
              node.data.options = [
                {
                  label: "DEFAULT",
                  nextNodeId: startNode.id,
                },
              ];
            } else {
              console.error(
                `Start node not found in chart: ${node.data.redirectTab}`
              );
            }
          } else {
            console.error(`Target chart not found: ${node.data.redirectTab}`);
          }
        } else {
          const nextEdge = connectedEdges.find((edge) => edge.source === node.id);
          node.data.nextNodeId = nextEdge ? nextEdge.target : "-1";
          node.data.options = [
            {
              label: "DEFAULT",
              nextNodeId: "-1",
            },
          ];
        }
      } else if (node.type === "startNode") {
        const nextEdge = connectedEdges.find((edge) => edge.source === node.id);
        node.data.nextNodeId = nextEdge ? nextEdge.target : null;
      }

      return node;
    });
  };

  useEffect(() => {
    const instanceId = decodeURIComponent(params.instanceId);
    const instance = chartInstances.find(
      (instance) => instance.id === instanceId
    );

    if (instance) {
      if (currentInstance?.id !== instance.id) {
        console.log("Setting current instance:", instance);
        setCurrentInstance(instance);
        const updatedNodes: any = updateNodesWithLogic(
          instance.initialNodes,
          instance.initialEdges,
          chartInstances
        );
        setNodes(updatedNodes);
        setEdges(instance.initialEdges);
        setNewColor(instance.color || "#80B500");
        setOnePageMode(instance.onePageMode || false);
        setNewTabName(instance.name);
        setNodesAndEdges(instance.name, updatedNodes, instance.initialEdges);
      }
    } else {
      if (currentInstance !== null) {
        console.log("Clearing current instance");
        setCurrentInstance(null);
        setNodes([]);
        setEdges([]);
        setNewColor("#80B500");
        setOnePageMode(false);
        setNewTabName("DEFAULT");
      }
    }
  }, [
    params.instanceId,
    chartInstances,
    currentInstance,
    setNodes,
    setEdges,
    setNodesAndEdges,
  ]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      const position = project({ x: event.clientX, y: event.clientY });
      let newNode: FlowNode;

      switch (type) {
        case "yesNo":
          newNode = {
            id: `${+new Date()}`,
            type,
            position,
            data: {
              label: `${type} node`,
              options: [
                { label: "yes", nextNodeId: null },
                { label: "no", nextNodeId: null },
              ],
            },
          };
          break;

        case "singleChoice":
        case "multipleChoice":
          newNode = {
            id: `${+new Date()}`,
            type,
            position,
            data: {
              label: `${type} node`,
              options: [
                { id: uuidv4(), label: "Option 1", nextNodeId: "-1" },
                { id: uuidv4(), label: "Option 2", nextNodeId: "-1" },
              ],
            },
          };
          break;

        case "weightNode":
          newNode = {
            id: `${+new Date()}`,
            type,
            position,
            data: {
              label: `${type} node`,
              weight: 1,
              nextNodeId: null,
              previousQuestionIds: [],
              options: [{ label: "DEFAULT", nextNodeId: null }],
            },
          };
          break;

        case "functionNode":
          newNode = {
            id: `${+new Date()}`,
            type,
            position,
            data: {
              expression: "",
              result: null,
            },
          };
          break;

        default:
          newNode = {
            id: `${+new Date()}`,
            type,
            position,
            data: {
              label: `${type} node`,
              options: [{ label: "DEFAULT", nextNodeId: null }],
            },
          };
          break;
      }

      console.log("Adding new node:", newNode);
      const updatedNodes: any = [...nodes, newNode];
      setNodes(updatedNodes);
      setNodesAndEdges(currentInstance?.name || "", updatedNodes, edges as any);
      toast.success("Node added.");
    },
    [project, setNodes, setNodesAndEdges, currentInstance, edges, nodes]
  );

  const onConnect = useCallback(
    (params) => {
      console.log("Connecting nodes with params:", params);
      const newEdges: any = addEdge({ ...params, type: "editableEdge" }, edges);

      const updatedNodes: any = updateNodesWithLogic(
        nodes,
        newEdges,
        chartInstances
      );

      setNodes(updatedNodes);
      setEdges(newEdges);
      setNodesAndEdges(currentInstance?.name || "", updatedNodes as any, newEdges);
    },
    [setEdges, setNodesAndEdges, currentInstance, nodes, edges, chartInstances]
  );

  const handleSaveSettings = () => {
    setVariables({ local: localVariables, global: globalVariables });
    if (currentInstance) {
      console.log("Saving settings for instance:", currentInstance.name);
      setCurrentTabColor(currentInstance.name, newColor);
      setOnePage(onePageMode);
      setShowSettings(false);
      toast.success("Settings saved.");
    }
  };

  const handleDeleteTab = () => {
    if (currentInstance) {
      setTabToDelete(currentInstance);
      setShowDeleteConfirmation(true);
    }
  };

  const confirmDeleteTab = () => {
    if (tabToDelete) {
      console.log("Deleting tab:", tabToDelete.name);
      deleteTab(tabToDelete.id);
      setShowSettings(false);
      setShowDeleteConfirmation(false);
      setTabToDelete(null);
      toast.success(`Tab "${tabToDelete.name}" deleted.`);
    }
  };

  const handleRenameTab = () => {
    if (newTabName && currentInstance) {
      console.log("Renaming tab from", currentInstance.name, "to", newTabName);
      updateChartInstanceName(currentInstance.id, newTabName);
      setCurrentTab(currentInstance.id);
      toast.success("Tab renamed successfully.");
    }
  };

  const handleVersionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedVersion = event.target.value;
    setSelectedVersion(selectedVersion);

    const versionData = currentInstance?.publishedVersions?.find(
      (version) => version.version.toString() === selectedVersion
    );

    if (versionData) {
      const { initialNodes, initialEdges }: any = versionData;
      const updatedNodes = updateNodesWithLogic(
        initialNodes,
        initialEdges,
        chartInstances
      );
      setNodes(updatedNodes);
      setEdges(initialEdges);
      setNodesAndEdges(
        currentInstance?.id || "",
        updatedNodes as any,
        initialEdges
      );
      console.log(
        "Reverting to selected version with nodes and edges:",
        initialNodes,
        initialEdges
      );
      toast.success("Reverted to selected version.");
    }
  };

  const handleAddVariable = (scope: "local" | "global") => {
    if (newVariableName.trim() && newVariableValue.trim()) {
      const newVariable = { name: newVariableName.trim(), value: newVariableValue.trim() };
      console.log(`Creating ${scope} variable:`, newVariable);

      if (scope === "local") {
        setLocalVariables((prev) => [...prev, newVariable]);
      } else if (scope === "global") {
        setGlobalVariables((prev) => [...prev, newVariable]);
        setVariables((prev) => ({
          ...prev,
          global: [...prev.global, newVariable],
        }));
      }

      setNewVariableName("");
      setNewVariableValue("");
      toast.success(`${scope.charAt(0).toUpperCase() + scope.slice(1)} variable created.`);
    } else {
      toast.error("Please enter both a name and a value for the variable.");
    }
  };

  const deleteVariable = (scope: "local" | "global", index: number) => {
    if (scope === "local") {
      const updatedVariables = [...localVariables];
      updatedVariables.splice(index, 1);
      setLocalVariables(updatedVariables);
    } else {
      const updatedVariables = [...globalVariables];
      updatedVariables.splice(index, 1);
      setGlobalVariables(updatedVariables);
      setVariables((prev) => ({
        ...prev,
        global: updatedVariables,
      }));
    }
    toast.success(`${scope.charAt(0).toUpperCase() + scope.slice(1)} variable deleted.`);
  };

  return (
    <div className="relative h-full w-full flex-grow">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
      >
        <Controls />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
      <button
        className="btn btn-ghost absolute right-4 top-4 z-10"
        onClick={() => setShowSettings(true)}
      >
        <Settings size={24} />
      </button>
      <Toaster />
      {showSettings && (
        <dialog open className="modal">
          <div className="modal-box">
            <div role="tablist" className="tabs tabs-bordered">
              <a
                role="tab"
                className={`tab ${activeTab === "local" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("local")}
              >
                Local Settings
              </a>
              <a
                role="tab"
                className={`tab ${activeTab === "global" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("global")}
              >
                Global Settings
              </a>
            </div>

            {activeTab === "local" && (
              <div className="mt-4">
                <h3 className="text-lg font-bold">Local Settings</h3>
                <div className="mt-4">
                  <label className="block">Tab Color</label>
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="h-10 w-full p-0"
                  />
                </div>
                <div className="mt-4 flex items-center">
                  <label className="mr-2">One Page Mode:</label>
                  <input
                    type="checkbox"
                    checked={onePageMode}
                    onChange={(e) => setOnePageMode(e.target.checked)}
                    className="form-checkbox"
                  />
                </div>
                <div className="mt-4">
                  <label className="block">Rename Tab</label>
                  <input
                    type="text"
                    value={newTabName}
                    onChange={(e) => setNewTabName(e.target.value)}
                    className="input input-bordered w-full"
                    placeholder="Enter new tab name"
                  />
                  <button
                    className="btn btn-primary mt-2"
                    onClick={handleRenameTab}
                  >
                    Rename
                  </button>
                </div>
                <div className="mt-4">
                  <label className="block">Add Local Variable</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newVariableName}
                      onChange={(e) => setNewVariableName(e.target.value)}
                      className="input input-bordered w-1/2"
                      placeholder="Variable Name"
                    />
                    <input
                      type="text"
                      value={newVariableValue}
                      onChange={(e) => setNewVariableValue(e.target.value)}
                      className="input input-bordered w-1/2"
                      placeholder="Variable Value"
                    />
                    <button
                      className="btn btn-primary"
                      onClick={() => handleAddVariable("local")}
                    >
                      Add
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block">Local Variables</label>
                  <table className="table-auto w-full">
                    <thead>
                      <tr>
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Value</th>
                        <th className="px-4 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localVariables.map((variable, index) => (
                        <tr key={index}>
                          <td className="border px-4 py-2">{variable.name}</td>
                          <td className="border px-4 py-2">{variable.value}</td>
                          <td className="border px-4 py-2">
                            <button
                              className="btn btn-error btn-sm"
                              onClick={() => deleteVariable("local", index)}
                            >
                              <Trash size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    className="btn btn-error"
                    onClick={handleDeleteTab}
                  >
                    Delete
                  </button>
                  <button className="btn" onClick={() => setShowSettings(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-success" onClick={handleSaveSettings}>
                    Save
                  </button>
                </div>
              </div>
            )}

            {activeTab === "global" && (
              <div className="mt-4">
                <h3 className="text-lg font-bold">Global Settings</h3>
                <div className="mt-4">
                  <label className="block">Select Version</label>
                  <select
                    value={selectedGlobalVersion}
                    onChange={handleVersionChange}
                    className="select select-bordered w-full"
                  >
                    <option value="">Select a version</option>
                    {currentInstance?.publishedVersions?.map((version) => (
                      <option key={version.version} value={version.version}>
                        {`${(version as any).message} - ${new Date(
                          version.date
                        ).toLocaleString()}`}
                      </option>
                    ))}
                  </select>
                  {selectedGlobalVersion && (
                    <button
                      className="btn btn-warning mt-2"
                      onClick={() =>
                        useStore.getState().revertToGlobalCommit(
                          selectedGlobalVersion
                        )
                      }
                    >
                      Revert to Version
                    </button>
                  )}
                </div>
                <div className="mt-4">
                  <label className="block">Add Global Variable</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newVariableName}
                      onChange={(e) => setNewVariableName(e.target.value)}
                      className="input input-bordered w-1/2"
                      placeholder="Variable Name"
                    />
                    <input
                      type="text"
                      value={newVariableValue}
                      onChange={(e) => setNewVariableValue(e.target.value)}
                      className="input input-bordered w-1/2"
                      placeholder="Variable Value"
                    />
                    <button
                      className="btn btn-primary"
                      onClick={() => handleAddVariable("global")}
                    >
                      Add
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block">Global Variables</label>
                  <table className="table-auto w-full">
                    <thead>
                      <tr>
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Value</th>
                        <th className="px-4 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {globalVariables.map((variable, index) => (
                        <tr key={index}>
                          <td className="border px-4 py-2">{variable.name}</td>
                          <td className="border px-4 py-2">{variable.value}</td>
                          <td className="border px-4 py-2">
                            <button
                              className="btn btn-error btn-sm"
                              onClick={() => deleteVariable("global", index)}
                            >
                              <Trash size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex justify-end space-x-2">
                  <button className="btn btn-success" onClick={handleSaveSettings}>
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
          <form method="dialog" className="modal-backdrop">
            <button>Close</button>
          </form>
        </dialog>
      )}

      {showDeleteConfirmation && (
        <dialog open className="modal">
          <div className="modal-box">
            <h3 className="text-lg font-bold">Confirm Delete</h3>
            <p>Are you sure you want to delete the tab &quot;{tabToDelete?.name}&quot;?</p>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                className="btn"
                onClick={() => setShowDeleteConfirmation(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={confirmDeleteTab}
              >
                Delete
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
};

export default InstancePage;
