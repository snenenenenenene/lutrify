// app/questionnaire/layout.tsx

"use client";
import { useEffect, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import useStore from "@/lib/store";
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from "next-auth/react";
import axios from "axios";
import { generateQuestionsFromChart } from "@/lib/utils";

export default function QuestionnaireLayout({ children }: { children: React.ReactNode }) {
  const { chartInstances, currentTab, setCurrentTab } = useStore((state) => ({
    chartInstances: state.chartInstances,
    currentTab: state.currentTab,
    setCurrentTab: state.setCurrentTab,
  }));

  const [questions, setQuestions] = useState<any[]>([]);
  const [claim, setClaim] = useState<string>("Be a hero, fly carbon zero");
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    setCurrentTab("Default");
  }, [setCurrentTab]);

  useEffect(() => {
    const fetchClaim = async () => {
      const initialClaim = searchParams.get('claim') || "Be a hero, fly carbon zero";
      if (status === "authenticated" && session?.user) {
        try {
          const response = await axios.get(`/api/claim?userId=${(session.user as any).id}`);
          setClaim(response.data.claim || initialClaim);
        } catch (err) {
          console.error(err);
          setClaim(initialClaim);
          toast.error("Failed to fetch the claim");
        }
      } else {
        setClaim(initialClaim);
      }
    };

    fetchClaim();
  }, [status, session, searchParams]);

  useEffect(() => {
    if (claim !== null && currentTab) {
      const currentInstance = chartInstances.find(instance => instance.name === currentTab);

      if (currentInstance) {
        const generatedQuestions = generateQuestionsFromChart(currentInstance);
        setQuestions(generatedQuestions);
        if (generatedQuestions.length > 0) {
          router.replace(`/questionnaire/${generatedQuestions[0].id}?claim=${encodeURIComponent(claim)}`);
        }
      }
    }
  }, [chartInstances, currentTab, claim, router]);

  return (
    <div className="flex h-screen w-full flex-col justify-between px-60 text-dark-gray">
      <Toaster />
      {children}
    </div>
  );
}