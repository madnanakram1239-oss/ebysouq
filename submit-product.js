// api/submit-product.js

// CONFIGURATION
// You must set these in your Vercel Environment Variables
const SHOP_URL = process.env.SHOPIFY_STORE_URL; // e.g., "your-shop.myshopify.com"
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN; // Your Admin API Access Token

export default async function handler(req, res) {
  // 1. Enable CORS (So your theme can talk to this script)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 2. Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { title, description, price, vendor, image_url, seller_email } = req.body;

    // 3. Validate Data
    if (!title || !price || !vendor) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 4. Construct Shopify Product Object
    const productData = {
      product: {
        title: title,
        body_html: description,
        vendor: vendor,
        product_type: "Seller Listing",
        status: "draft", // IMPORTANT: Create as Draft
        variants: [
          {
            price: price,
            inventory_management: "shopify",
            inventory_policy: "deny",
            inventory_quantity: 1 // Default stock
            // We don't set SKU here, but you could generate one
          }
        ],
        images: image_url ? [{ src: image_url }] : [],
        tags: `seller_submission, pending_approval, seller:${seller_email}`
      }
    };

    // 5. Send to Shopify
    const shopifyResponse = await fetch(`https://${SHOP_URL}/admin/api/2023-10/products.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ACCESS_TOKEN
      },
      body: JSON.stringify(productData)
    });

    const data = await shopifyResponse.json();

    if (!shopifyResponse.ok) {
      console.error('Shopify API Error:', data);
      return res.status(500).json({ error: 'Failed to create product in Shopify', details: data });
    }

    // 6. Success
    return res.status(200).json({ 
      success: true, 
      message: 'Product created successfully', 
      product_id: data.product.id 
    });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
