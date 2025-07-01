import { PrismaClient } from '@/generated/prisma'; // Adjust the path as necessary

const prisma = new PrismaClient();

// GET /api/purchases - Fetch all purchase data
export async function GET(request: Request) {
  try {
    const purchases = await prisma.purchase.findMany({
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });
    return new Response(JSON.stringify(purchases), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return new Response(JSON.stringify({ message: 'Failed to fetch purchases' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

// POST /api/purchases - Create a new purchase record
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { supplierId, totalAmount, items } = body;

    if (!supplierId || !totalAmount || !items || !Array.isArray(items) || items.length === 0) {
        return new Response(JSON.stringify({ message: 'Invalid request body' }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
            },
          });
    }

    const newPurchase = await prisma.purchase.create({
      data: {
        supplierId,
        totalAmount,
        items: {
          create: items.map((item: { productId: number; quantity: number; price: number }) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        items: true, // Include created items in the response
      },
    });

    return new Response(JSON.stringify(newPurchase), {
      status: 201, // Created
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error creating purchase:', error);
    return new Response(JSON.stringify({ message: 'Failed to create purchase' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}