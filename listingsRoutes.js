const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create images directory if it doesn't exist
const uploadDir = path.join(__dirname, 'image_path');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create folder for each listing
        const userId = req.body.userId || 'unknown';
        const timestamp = Date.now();
        const folderPath = path.join(uploadDir, `${userId}_${timestamp}`);
        fs.mkdirSync(folderPath, { recursive: true });
        console.log(`Creating upload directory: ${folderPath}`);
        cb(null, folderPath);
    },
    filename: function (req, file, cb) {
        // Rename file to avoid collisions
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = uniqueSuffix + path.extname(file.originalname);
        console.log(`Saving file as: ${filename}`);
        cb(null, filename);
    }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload only images.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// This is to access the database connection from server.js
let pool;
const setPool = (dbPool) => {
    pool = dbPool;
};

// Helper function to check if an image exists
function checkImageExists(imagePath) {
    // Remove the leading slash if present
    if (imagePath && imagePath.startsWith('/')) {
        imagePath = imagePath.substring(1);
    }
    
    if (!imagePath) return false;
    
    const fullPath = path.join(__dirname, imagePath);
    
    try {
        return fs.existsSync(fullPath);
    } catch (err) {
        console.error("Error checking if image exists:", err);
        return false;
    }
}

// Endpoint to create a new t-shirt listing
router.post('/', upload.array('images', 5), async (req, res) => {
    const { userId, bandId, size, condition, price, description, gender } = req.body;

    // Validate required fields
    if (!userId || !bandId || !size || !condition || !price || !description || !gender) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // Get file paths for storing in database
        const imagePaths = req.files.map(file => {
            // Store the relative path from the server root
            return '/images/' + path.relative(uploadDir, file.path).replace(/\\/g, '/');
        });

        // Save the first image as the main image (displayed in listings)
        const mainImageUrl = imagePaths.length > 0 ? imagePaths[0] : null;

        // Insert the t-shirt into the database - using the renamed column
        const [result] = await pool.promise().query(
            "INSERT INTO tshirts (userId, bandId, size, item_condition, price, description, imageUrl, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [userId, bandId, size, condition, price, description, mainImageUrl, gender]
        );

        // If we have multiple images, store them in a separate table
        if (imagePaths.length > 1) {
            // Create a new table for storing multiple images if it doesn't exist
            await pool.promise().query(`
                CREATE TABLE IF NOT EXISTS tshirt_images (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    tshirtId INT NOT NULL,
                    imageUrl VARCHAR(255) NOT NULL,
                    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (tshirtId) REFERENCES tshirts(idTShirt) ON DELETE CASCADE
                )
            `);

            // Insert all image paths
            const tshirtId = result.insertId;
            for (const imagePath of imagePaths) {
                await pool.promise().query(
                    'INSERT INTO tshirt_images (tshirtId, imageUrl) VALUES (?, ?)',
                    [tshirtId, imagePath]
                );
            }
        }

        res.status(201).json({ 
            message: 'Listing created successfully', 
            listingId: result.insertId,
            images: imagePaths
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to get all listings
router.get('/', async (req, res) => {
    try {
        // Build query based on filters - avoiding 'condition' as alias
        let query = `
            SELECT t.*, b.name as bandName, u.fname, u.lname 
            FROM tshirts t
            JOIN bands b ON t.bandId = b.idBand
            JOIN users u ON t.userId = u.idUsers
        `;
        
        const filters = [];
        const params = [];
        
        // Add filters if they exist
        if (req.query.bandId) {
            filters.push('t.bandId = ?');
            params.push(req.query.bandId);
        }
        
        if (req.query.size) {
            filters.push('t.size = ?');
            params.push(req.query.size);
        }
        
        if (req.query.gender) {
            filters.push('t.gender = ?');
            params.push(req.query.gender);
        }
        
        // Updated to use the renamed column
        if (req.query.condition) {
            filters.push('t.item_condition = ?');
            params.push(req.query.condition);
        }
        
        if (req.query.minPrice) {
            filters.push('t.price >= ?');
            params.push(req.query.minPrice);
        }
        
        if (req.query.maxPrice) {
            filters.push('t.price <= ?');
            params.push(req.query.maxPrice);
        }
        
        // Add limit if it exists
        let limit = '';
        if (req.query.limit) {
            limit = ' LIMIT ?';
            params.push(parseInt(req.query.limit));
        }
        
        // Add WHERE clause if filters exist
        if (filters.length > 0) {
            query += ' WHERE ' + filters.join(' AND ');
        }
        
        // Add order by
        query += ' ORDER BY t.createdAt DESC' + limit;
        
        const [listings] = await pool.promise().query(query, params);
        
        // Map item_condition to condition for frontend compatibility
        listings.forEach(listing => {
            // Explicitly create condition property
            listing.condition = listing.item_condition;
            
            // Check image path
            if (listing.imageUrl) {
                // Ensure path starts with /
                if (!listing.imageUrl.startsWith('/')) {
                    listing.imageUrl = '/' + listing.imageUrl;
                }

                // Check if image exists (optional)
                if (!checkImageExists(listing.imageUrl)) {
                    console.warn(`Image not found: ${listing.imageUrl}`);
                    listing.imageUrl = '/placeholder.jpg';
                }
            } else {
                listing.imageUrl = '/placeholder.jpg';
            }
        });
        
        res.json(listings);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to get a specific listing
router.get('/:id', async (req, res) => {
    try {
        // Get the listing details without using 'condition' as alias
        const [listings] = await pool.promise().query(`
            SELECT t.*, b.name as bandName, u.fname, u.lname, u.email
            FROM tshirts t
            JOIN bands b ON t.bandId = b.idBand
            JOIN users u ON t.userId = u.idUsers
            WHERE t.idTShirt = ?
        `, [req.params.id]);

        if (listings.length === 0) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        const listing = listings[0];
        
        // Map item_condition to condition for frontend compatibility
        listing.condition = listing.item_condition;

        // Check if main image exists
        if (listing.imageUrl) {
            // Ensure path starts with /
            if (!listing.imageUrl.startsWith('/')) {
                listing.imageUrl = '/' + listing.imageUrl;
            }
            
            if (!checkImageExists(listing.imageUrl)) {
                console.warn(`Main image not found: ${listing.imageUrl}`);
                listing.imageUrl = '/placeholder.jpg';
            }
        } else {
            listing.imageUrl = '/placeholder.jpg';
        }

        // Check if we have a tshirt_images table and get additional images
        const [tables] = await pool.promise().query("SHOW TABLES LIKE 'tshirt_images'");
        
        if (tables.length > 0) {
            const [images] = await pool.promise().query(`
                SELECT imageUrl FROM tshirt_images
                WHERE tshirtId = ?
            `, [req.params.id]);
            
            // Add all images to the listing
            listing.images = images.map(img => {
                let imagePath = img.imageUrl;
                
                // Ensure path starts with /
                if (imagePath && !imagePath.startsWith('/')) {
                    imagePath = '/' + imagePath;
                }
                
                if (imagePath && !checkImageExists(imagePath)) {
                    console.warn(`Additional image not found: ${imagePath}`);
                    return '/placeholder.jpg';
                }
                return imagePath;
            });
        } else {
            // If no additional images table, just use the main image
            listing.images = listing.imageUrl ? [listing.imageUrl] : ['/placeholder.jpg'];
        }

        res.json(listing);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = { 
    router,
    setPool,
    uploadDir
};