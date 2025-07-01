// src/app/api/customers/route.ts
import { PrismaClient } from '@/generated/prisma'; // আপনার জেনারেট হওয়া Prisma Client এর সঠিক পাথ

const prisma = new PrismaClient();

// GET /api/customers - সমস্ত গ্রাহক ডেটা ফেচ করার জন্য
export async function GET(request: Request) {
  try {
    const customers = await prisma.customer.findMany();
    return new Response(JSON.stringify(customers), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return new Response(JSON.stringify({ message: 'Failed to fetch customers' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

// POST /api/customers - নতুন গ্রাহক ডেটা তৈরি করার জন্য
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // রিকোয়েস্ট বডি থেকে প্রয়োজনীয় ফিল্ডগুলো নিন (আপনার schema.prisma অনুযায়ী)
    const { name, contact, address } = body;

    if (!name) {
        return new Response(JSON.stringify({ message: 'Name is required' }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
          });
    }

    const newCustomer = await prisma.customer.create({
      data: {
        name,
        contact,
        address,
      },
    });

    return new Response(JSON.stringify(newCustomer), {
      status: 201, // Created
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    return new Response(JSON.stringify({ message: 'Failed to create customer' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
