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
        if (!req.uploadFolderPath) {
            const userId = req.body.userId || 'unknown';
            const timestamp = Date.now();
            req.uploadFolderPath = path.join(uploadDir, `${userId}_${timestamp}`);
            
            // Create the directory if it doesn't exist
            if (!fs.existsSync(req.uploadFolderPath)) {
                fs.mkdirSync(req.uploadFolderPath, { recursive: true });
                console.log(`Created upload directory: ${req.uploadFolderPath}`);
            }
        }
        
        cb(null, req.uploadFolderPath);
    },
    filename: function (req, file, cb) {
        // Log the received file information
        console.log(`Received file: ${file.originalname}, mimetype: ${file.mimetype}, size: ${file.size || 'unknown'}`);
        
        // Rename file to avoid collisions
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const filename = uniqueSuffix + path.extname(file.originalname);
        console.log(`Saving file as: ${filename} in folder: ${req.uploadFolderPath}`);
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
            // Log for debugging
            console.log(`File path: ${file.path}`);
            console.log(`Upload dir: ${uploadDir}`);
            
            // Get the relative path - declare before using
            const relativePath = path.relative(uploadDir, file.path);
            console.log(`Relative path: ${relativePath}`);
            
            // Format the path for web URLs
            return '/images/' + path.relative(uploadDir, file.path).replace(/\\/g, '/');
        });

        console.log('Image paths to be saved:', imagePaths);

        // Save the first image as the main image (displayed in listings)
        const mainImageUrl = imagePaths.length > 0 ? imagePaths[0] : null;

        // Insert the t-shirt into the database
        const [result] = await pool.promise().query(
            "INSERT INTO tshirts (userId, bandId, size, item_condition, price, description, gender) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [userId, bandId, size, condition, price, description, gender]
        );

        const tshirtId = result.insertId;
        console.log(`Created new tshirt with ID: ${tshirtId}`);

        // Insert all images into tshirt_images table
        const imageInsertPromises = imagePaths.map(imagePath => 
            pool.promise().query(
                'INSERT INTO tshirt_images (tshirtId, imageUrl) VALUES (?, ?)',
                [tshirtId, imagePath]
            )
        );

        await Promise.all(imageInsertPromises);
        console.log(`Inserted ${imagePaths.length} images for tshirt ID: ${tshirtId}`);

        res.status(201).json({ 
            message: 'Listing created successfully', 
            listingId: tshirtId,
            images: imagePaths
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal Server Error: ' + err.message });
    }
});

// Endpoint to update an existing t-shirt listing
router.put('/:id', upload.array('images', 5), async (req, res) => {
    const listingId = req.params.id;
    const { userId, bandId, size, condition, price, description, gender, removedImageIds } = req.body;

    // Validate required fields
    if (!userId || !bandId || !size || !condition || !price || !description || !gender) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // Check if the listing exists and belongs to the user
        const [listings] = await pool.promise().query(
            'SELECT * FROM tshirts WHERE idTShirt = ? AND userId = ?',
            [listingId, userId]
        );
        
        if (listings.length === 0) {
            return res.status(403).json({ 
                error: 'You are not authorized to update this listing or it does not exist' 
            });
        }
        
        // Update the listing in the database
        await pool.promise().query(
            `UPDATE tshirts 
             SET bandId = ?, size = ?, item_condition = ?, 
                 gender = ?, price = ?, description = ?
             WHERE idTShirt = ?`,
            [bandId, size, condition, gender, price, description, listingId]
        );
        
        // Process removed images if any
        if (removedImageIds && typeof removedImageIds === 'string') {
            try {
                const removedIds = JSON.parse(removedImageIds);
                if (Array.isArray(removedIds) && removedIds.length > 0) {
                    // Get image IDs for the listing
                    const [imageRows] = await pool.promise().query(
                        'SELECT id, imageUrl FROM tshirt_images WHERE tshirtId = ? ORDER BY id ASC',
                        [listingId]
                    );
                    
                    // Delete specified images by index
                    for (const index of removedIds) {
                        if (index >= 0 && index < imageRows.length) {
                            const imageId = imageRows[index].id;
                            await pool.promise().query(
                                'DELETE FROM tshirt_images WHERE id = ?',
                                [imageId]
                            );
                            console.log(`Deleted image ID ${imageId} for listing ${listingId}`);
                        }
                    }
                }
            } catch (parseError) {
                console.error('Error parsing removedImageIds:', parseError);
            }
        }
        
        // Process new images
        if (req.files && req.files.length > 0) {
            // Get file paths for storing in database
            const imagePaths = req.files.map(file => {
                // Format the path for web URLs
                return '/images/' + path.relative(uploadDir, file.path).replace(/\\/g, '/');
            });

            console.log('New image paths to be saved:', imagePaths);

            // Insert all images into tshirt_images table
            const imageInsertPromises = imagePaths.map(imagePath => 
                pool.promise().query(
                    'INSERT INTO tshirt_images (tshirtId, imageUrl) VALUES (?, ?)',
                    [listingId, imagePath]
                )
            );

            await Promise.all(imageInsertPromises);
            console.log(`Inserted ${imagePaths.length} new images for tshirt ID: ${listingId}`);
        }

        // Fetch the updated listing with its images
        const [updatedListing] = await pool.promise().query(`
            SELECT t.*, b.name as bandName
            FROM tshirts t
            JOIN bands b ON t.bandId = b.idBand
            WHERE t.idTShirt = ?
        `, [listingId]);
        
        const [images] = await pool.promise().query(`
            SELECT imageUrl FROM tshirt_images
            WHERE tshirtId = ?
            ORDER BY id ASC
        `, [listingId]);
        
        // Add images to the response
        const responseData = updatedListing[0] || {};
        responseData.images = images.map(img => img.imageUrl);

        res.json({ 
            message: 'Listing updated successfully', 
            listingId: listingId,
            listing: responseData
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal Server Error: ' + err.message });
    }
});

// Endpoint to get all listings
router.get('/', async (req, res) => {
    try {
        // Build base query
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
        
        // Add WHERE clause if filters exist
        if (filters.length > 0) {
            query += ' WHERE ' + filters.join(' AND ');
        }
        
        // Add order by and limit
        query += ' ORDER BY t.createdAt DESC';
        
        if (req.query.limit) {
            query += ' LIMIT ?';
            params.push(parseInt(req.query.limit));
        }
        
        const [listings] = await pool.promise().query(query, params);
        
        // For each listing, get the main image from the tshirt_images table
        for (let listing of listings) {
            const [images] = await pool.promise().query(`
                SELECT imageUrl FROM tshirt_images 
                WHERE tshirtId = ? 
                ORDER BY id ASC LIMIT 1
            `, [listing.idTShirt]);
            
            if (images.length > 0) {
                listing.imageUrl = images[0].imageUrl;
            } else if (!listing.imageUrl) {
                listing.imageUrl = '/placeholder.jpg';
            }
        }
        
        res.json(listings);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to get a specific listing
router.get('/:id', async (req, res) => {
    try {
        // Get the listing details
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
        
        // Get all images for this listing from tshirt_images table
        const [images] = await pool.promise().query(`
            SELECT imageUrl FROM tshirt_images
            WHERE tshirtId = ?
            ORDER BY id ASC
        `, [req.params.id]);
        
        // Add all images to the listing
        listing.images = images.map(img => img.imageUrl);
        
        // If no images found in tshirt_images but we have a main image in tshirts
        if (listing.images.length === 0 && listing.imageUrl) {
            listing.images = [listing.imageUrl];
        }
        
        // If still no images, use placeholder
        if (listing.images.length === 0) {
            listing.images = ['/placeholder.jpg'];
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