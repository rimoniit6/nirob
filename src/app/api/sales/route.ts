// src/app/api/sales/route.ts
import { PrismaClient } from '@/generated/prisma'; // Adjust the path if necessary
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

// GET /api/sales - Fetch all sales including customer and items
export async function GET(request: Request) {
  try {
    const sales = await prisma.sale.findMany({
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
    return NextResponse.json(sales, { status: 200 });
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ message: 'Failed to fetch sales' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// POST /api/sales - Create a new sale record along with sale items
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, totalAmount, items } = body;

    if (customerId === undefined || totalAmount === undefined || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: 'Invalid request body. customerId, totalAmount, and items array are required.' }, { status: 400 });
    }

    // Validate items structure
    for (const item of items) {
        if (item.productId === undefined || item.quantity === undefined || item.price === undefined) {
             return NextResponse.json({ message: 'Invalid item structure in items array. Each item must have productId, quantity, and price.' }, { status: 400 });
        }
    }


    const newSale = await prisma.sale.create({
      data: {
        customerId: customerId,
        totalAmount: totalAmount,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        customer: true,
        items: {
           include: {
            product: true,
           }
        },
      },
    });

    return NextResponse.json(newSale, { status: 201 }); // Created
  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json({ message: 'Failed to create sale' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// Add PUT and DELETE handlers for specific sales by ID if needed
// For example, create src/app/api/sales/[id]/route.ts