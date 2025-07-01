// src/app/api/users/route.ts
import { PrismaClient } from '@prisma/client'; // আপনার Prisma Client এর পাথ চেক করে নিন

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    // ডেটাবেস থেকে সমস্ত ইউজার ডেটা ফেচ করুন
    const users = await prisma.user.findMany();

    // সফল রেসপন্স পাঠান
    return new Response(JSON.stringify(users), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);

    // এরর রেসপন্স পাঠান
    return new Response(JSON.stringify({ message: 'Failed to fetch users' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

// আপনি চাইলে অন্যান্য HTTP মেথডের জন্য ফাংশন যোগ করতে পারেন, যেমন POST, PUT, DELETE
/*
export async function POST(request: Request) {
  // নতুন ইউজার তৈরি করার লজিক এখানে লিখুন
}

export async function PUT(request: Request) {
  // ইউজার ডেটা আপডেট করার লজিক এখানে লিখুন
}

export async function DELETE(request: Request) {
  // ইউজার ডিলিট করার লজিক এখানে লিখুন
}
*/
