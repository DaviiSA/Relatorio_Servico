
import { FormData } from '../types';

// Helper function to convert a File to a base64 string
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};


/**
 * This function sends the form data to a Vercel Serverless Function.
 * You need to create a file at `/api/submit-report.ts` in your Vercel project.
 * An example of the serverless function code is provided below.
 */
export const sendData = async (formData: FormData): Promise<void> => {
  // 1. Convert all image files to base64 strings
  const imagePromises = formData.images.map(fileToBase64);
  const base64Images = await Promise.all(imagePromises);

  // 2. Prepare the payload for the API
  const payload = {
    workOrderNumber: formData.workOrderNumber,
    workType: formData.workType,
    collaborators: formData.collaborators,
    laborItems: formData.laborItems.map(item => ({
      code: item.code,
      quantity: item.quantity,
      actionType: item.actionType,
    })),
    images: base64Images, // Array of base64 data URLs
  };

  // 3. Send the data to the Vercel serverless function endpoint
  const response = await fetch('/api/submit-report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  // 4. Handle the response
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Ocorreu um erro desconhecido.' }));
    throw new Error(errorData.message || `O servidor respondeu com o status: ${response.status}`);
  }
};

/*
// --- Example Vercel Serverless Function (`/api/submit-report.ts`) ---
// This code would run on Vercel's backend, not in the browser.
// You would need to set up a database (e.g., Vercel Postgres) to store the data.

import { VercelRequest, VercelResponse } from '@vercel/node';
// import { sql } from '@vercel/postgres'; // Example using Vercel Postgres

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { workOrderNumber, workType, collaborators, laborItems, images } = request.body;
    
    // Here you would typically validate the incoming data
    // and then insert it into your database.
    // For example, with Vercel Postgres:
    // await sql`
    //   INSERT INTO service_reports (work_order_number, work_type, collaborators, labor_items, images)
    //   VALUES (${workOrderNumber}, ${workType}, ${JSON.stringify(collaborators)}, ${JSON.stringify(laborItems)}, ${JSON.stringify(images)});
    // `;

    console.log('Received data:', { workOrderNumber, workType }); // Log for debugging

    return response.status(200).json({ message: 'Report submitted successfully' });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ message: 'Failed to submit report' });
  }
}
*/
