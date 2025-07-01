// src/app/api/products/route.ts
import { PrismaClient } from '@/generated/prisma'; // Adjust the path if necessary

const prisma = new PrismaClient();

// GET /api/products - Fetch all products
export async function GET(request: Request) {
  try {
    const products = await prisma.product.findMany();
    return new Response(JSON.stringify(products), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return new Response(JSON.stringify({ message: 'Failed to fetch products' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

// POST /api/products - Create a new product
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Destructure expected fields from the request body
    const { name, description, price, stock } = body;

    // Basic validation
    if (!name || price === undefined || stock === undefined) {
      return new Response(JSON.stringify({ message: 'Name, price, and stock are required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Ensure price and stock are numbers
    if (typeof price !== 'number' || typeof stock !== 'number') {
        return new Response(JSON.stringify({ message: 'Price and stock must be numbers' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        });
    }


    const newProduct = await prisma.product.create({
      data: {
        name,
        description,
        price,
        stock,
      },
    });

    return new Response(JSON.stringify(newProduct), {
      status: 201, // Created
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return new Response(JSON.stringify({ message: 'Failed to create product' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

// You can add similar functions for PUT and DELETE requests
// For PUT /api/products/[id] and DELETE /api/products/[id], you'll need a dynamic route ([id] folder)