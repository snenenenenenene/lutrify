// app/api/claims/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const { claim } = await request.json();
    
    if (!claim || typeof claim !== 'string') {
      return NextResponse.json(
        { error: "Invalid claim data" },
        { status: 400 }
      );
    }

    const newClaim = await prisma.claim.create({
      data: {
        claim,
        userId: (session.user as any).id,
      },
    });

    return NextResponse.json({ 
      success: true, 
      claim: {
        ...newClaim,
        status: 'IN_PROGRESS',
        progress: 0
      }
    });
  } catch (error) {
    console.error('Failed to create claim:', error);
    return NextResponse.json(
      { error: "Failed to create claim" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const claims = await prisma.claim.findMany({
      where: {
        userId: (session.user as any).id,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Enrich claims with status and progress
    const enrichedClaims = claims.map(claim => {
      return {
        ...claim,
        status: 'IN_PROGRESS', // You'll need to determine this based on your actual logic
        progress: 30, // You'll need to calculate this based on your actual logic
      };
    });

    return NextResponse.json({ claims: enrichedClaims });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: "Failed to fetch claims" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const { id, status, progress } = await request.json();
    
    // Verify claim belongs to user
    const claim = await prisma.claim.findFirst({
      where: {
        id,
        userId: (session.user as any).id,
      },
    });

    if (!claim) {
      return NextResponse.json(
        { error: "Claim not found" },
        { status: 404 }
      );
    }

    // Update claim
    const updatedClaim = await prisma.claim.update({
      where: { id },
      data: {
        updatedAt: new Date(),
        // You can add additional fields to update here
      },
    });

    return NextResponse.json({ claim: updatedClaim });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: "Failed to update claim" },
      { status: 500 }
    );
  }
}