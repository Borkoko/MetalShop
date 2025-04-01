
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

// Import the listings routes module
const listingsModule = require('./listingsRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Define paths for images and placeholder
const imagePath = path.join(__dirname, 'image_path');
const placeholderPath = path.join(__dirname, 'placeholder.jpg');

// Create the image_path directory if it doesn't exist
if (!fs.existsSync(imagePath)) {
    fs.mkdirSync(imagePath, { recursive: true });
    console.log(`Created image directory: ${imagePath}`);
}

// Create a simple placeholder image if it doesn't exist
const createPlaceholderImage = () => {
    // Check if placeholder already exists
    if (fs.existsSync(placeholderPath)) {
        console.log('Placeholder image already exists at:', placeholderPath);
        return;
    }
    
    console.log('Creating a default placeholder image...');
    
    // This is a base64 encoded 1x1 pixel JPEG
    const base64Image = '/9j/4AAQSkZJRgABAQEAYABgAAD//gA7Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBxdWFsaXR5ID0gOTAK/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwKDAwLCgsLDQ4SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU/9sAQwEDBAQFBAUJBQUJFA0LDRQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU/8AAEQgAAQABAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A/fygkAZPAFNkkSKNpJHVEUZZmOAB6mvl/wCIvx/1HxLqVx4f8IahPpOlxkxzahBlJbr12n+GP05b61lUqRprU6KNCdeVonofiz4x+H/CF1Ha6nqKC8YZFrCpklx6heQPqa0/C/i/QPGFv5uilLe8UZks5iBIn4f3h7V8dW1vHbJtQtgkkljksfU+9XrLULrSL2O8spZLa4ibckiHBB/z2rH63fRG/wDZnLrNn//Z';
    
    try {
        // Convert base64 to binary
        const imageData = Buffer.from(base64Image, 'base64');
        
        // Write to file
        fs.writeFileSync(placeholderPath, imageData);
        console.log('Created placeholder image at:', placeholderPath);
    } catch (error) {
        console.error('Failed to create placeholder image:', error);
    }
};

// Create the placeholder image if needed
createPlaceholderImage();

// Serve images from the image_path directory
app.use('/images', express.static(imagePath));

// Serve placeholder image
app.use('/placeholder.jpg', express.static(placeholderPath));

// Debug logging
console.log(`Images are being served from: ${imagePath}`);
console.log(`They will be accessible at: http://localhost:3000/images/...`);
console.log(`Placeholder image is served at: http://localhost:3000/placeholder.jpg`);

app.use('/listings', listingsModule.router);

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'project',
  database: 'metalshop',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Ensure tshirt_images table exists
pool.query(`
  CREATE TABLE IF NOT EXISTS tshirt_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tshirtId INT NOT NULL,
    imageUrl VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tshirtId) REFERENCES tshirts(idTShirt) ON DELETE CASCADE
  )
`, (err) => {
  if (err) {
    console.error('Error creating tshirt_images table:', err);
  } else {
    console.log('Ensured tshirt_images table exists');
  }
});

// Pass the database pool to the listings module
listingsModule.setPool(pool);

// User registration endpoint
app.post('/users', async (req, res) => {
    const { fname, lname, email, password } = req.body;

    if (!fname || !lname || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // Check if the email already exists
        const [existingUsers] = await pool.promise().query(
            'SELECT * FROM Users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Email already in use' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10); // 10 = salt rounds

        // Insert new user into database
        const [result] = await pool.promise().query(
            'INSERT INTO Users (fname, lname, email, password) VALUES (?, ?, ?, ?)',
            [fname, lname, email, hashedPassword]
        );

        res.json({ message: 'User registered successfully', userId: result.insertId });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const uploadDir = path.join(__dirname, 'image_path');

// Create the upload directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Created upload directory: ${uploadDir}`);
}

// Login endpoint
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  pool.query('SELECT * FROM Users WHERE email = ?', [email], (err, results) => {
      if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Internal Server Error' });
      }

      if (results.length === 0) {
          return res.status(401).json({ error: 'Invalid email or password' });
      }

      const user = results[0];

      bcrypt.compare(password, user.password, (err, match) => {
          if (err) {
              console.error('Bcrypt error:', err);
              return res.status(500).json({ error: 'Password verification failed' });
          }

          if (!match) {
              return res.status(401).json({ error: 'Invalid email or password' });
          }

          res.json({ 
              message: 'Login successful', 
              userId: user.idUsers,
              userName: user.fname
          });
      });
  });
});

// Get user endpoint
app.get('/users/:id', (req, res) => {
    const userId = req.params.id;
    
    pool.query('SELECT idUsers, fname, lname, email, createdAt FROM Users WHERE idUsers = ?', [userId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = results[0];
        res.json({
            userId: user.idUsers,
            firstName: user.fname,
            lastName: user.lname,
            email: user.email,
            createdAt: user.createdAt
        });
    });
});

// Check if email exists endpoint
app.get('/check-email', async (req, res) => {
    const email = req.query.email;
    
    if (!email) {
        return res.status(400).json({ error: 'Email parameter is required' });
    }
    
    try {
        const [users] = await pool.promise().query(
            'SELECT * FROM Users WHERE email = ?',
            [email]
        );
        
        res.json({ exists: users.length > 0 });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Bands endpoint
app.get('/bands', (req, res) => {
    pool.query('SELECT idBand, name FROM bands', (err, results) => {
        if (err) {
            console.error("Database error:", err);
            res.status(500).json({ error: "Internal Server Error" });
        } else {
            res.json(results);
        }
    });
});

// Wishlist endpoint
app.post('/wishlist', async (req, res) => {
    const { userId, tshirtId } = req.body;
    
    if (!userId || !tshirtId) {
        return res.status(400).json({ error: 'User ID and T-shirt ID are required' });
    }
    
    try {
        // Check if item is already in wishlist
        const [existing] = await pool.promise().query(
            'SELECT * FROM wishlist WHERE userId = ? AND tshirtId = ?',
            [userId, tshirtId]
        );
        
        if (existing.length > 0) {
            // Item exists, so remove it from wishlist
            await pool.promise().query(
                'DELETE FROM wishlist WHERE userId = ? AND tshirtId = ?',
                [userId, tshirtId]
            );
            
            return res.json({ 
                message: 'Removed from wishlist successfully',
                action: 'removed'
            });
        }
        
        // Add to wishlist
        await pool.promise().query(
            'INSERT INTO wishlist (userId, tshirtId) VALUES (?, ?)',
            [userId, tshirtId]
        );
        
        res.status(201).json({ 
            message: 'Added to wishlist successfully',
            action: 'added'
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Get wishlist items
app.get('/wishlist/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    try {
        const [items] = await pool.promise().query(`
            SELECT w.*, t.*, b.name as bandName, t.item_condition as condition
            FROM wishlist w
            JOIN tshirts t ON w.tshirtId = t.idTShirt
            JOIN bands b ON t.bandId = b.idBand
            WHERE w.userId = ?
            ORDER BY w.addedAt DESC
        `, [userId]);
        
        res.json(items);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Utility endpoint to fix image paths
app.get('/fix-image-paths', async (req, res) => {
    try {
        // Check and update image paths in the tshirts table
        const [tshirtRows] = await pool.promise().query('SELECT idTShirt, imageUrl FROM tshirts');
        
        let updates = 0;
        
        for (const row of tshirtRows) {
            if (row.imageUrl) {
                let newPath = row.imageUrl;
                let needsUpdate = false;
                
                // If the path doesn't start with a slash, add one
                if (!newPath.startsWith('/')) {
                    newPath = '/' + newPath;
                    needsUpdate = true;
                }
                
                // If path has /uploads/ instead of /images/, replace it
                if (newPath.includes('/uploads/')) {
                    newPath = newPath.replace('/uploads/', '/images/');
                    needsUpdate = true;
                }
                
                if (needsUpdate) {
                    await pool.promise().query(
                        'UPDATE tshirts SET imageUrl = ? WHERE idTShirt = ?',
                        [newPath, row.idTShirt]
                    );
                    updates++;
                }
            }
        }
        
        // Check and update image paths in the tshirt_images table
        const [imageRows] = await pool.promise().query('SELECT id, imageUrl FROM tshirt_images');
        
        for (const img of imageRows) {
            if (img.imageUrl) {
                let newPath = img.imageUrl;
                let needsUpdate = false;
                
                // If the path doesn't start with a slash, add one
                if (!newPath.startsWith('/')) {
                    newPath = '/' + newPath;
                    needsUpdate = true;
                }
                
                // If path has /uploads/ instead of /images/, replace it
                if (newPath.includes('/uploads/')) {
                    newPath = newPath.replace('/uploads/', '/images/');
                    needsUpdate = true;
                }
                
                if (needsUpdate) {
                    await pool.promise().query(
                        'UPDATE tshirt_images SET imageUrl = ? WHERE id = ?',
                        [newPath, img.id]
                    );
                    updates++;
                }
            }
        }
        
        const [updatedTshirts] = await pool.promise().query('SELECT idTShirt, imageUrl FROM tshirts');
        const [updatedImages] = await pool.promise().query('SELECT id, imageUrl FROM tshirt_images');
        
        res.json({
            message: `Updated ${updates} image paths`,
            tshirtListings: updatedTshirts,
            tshirtImages: updatedImages
        });
    } catch (error) {
        console.error('Error fixing image paths:', error);
        res.status(500).json({ error: 'Failed to fix image paths' });
    }
});

app.post('/chat/create', async (req, res) => {
    const { senderId, receiverId, tshirtId } = req.body;

    // Input validation
    if (!senderId || !receiverId || !tshirtId) {
        return res.status(400).json({ error: 'Sender ID, Receiver ID, and Tshirt ID are required' });
    }

    // Prevent chatting with self
    if (senderId === receiverId) {
        return res.status(400).json({ error: 'You cannot chat with yourself' });
    }

    try {
        // Verify both sender and receiver exist
        const [senderCheck] = await pool.promise().query(
            'SELECT * FROM users WHERE idUsers = ?',
            [senderId]
        );
        const [receiverCheck] = await pool.promise().query(
            'SELECT * FROM users WHERE idUsers = ?',
            [receiverId]
        );

        if (senderCheck.length === 0 || receiverCheck.length === 0) {
            return res.status(404).json({ error: 'Invalid user IDs' });
        }

        // Check if the tshirt exists
        const [tshirtCheck] = await pool.promise().query(
            'SELECT userId FROM tshirts WHERE idTShirt = ?',
            [tshirtId]
        );

        if (tshirtCheck.length === 0) {
            return res.status(404).json({ error: 'Tshirt not found' });
        }

        // Prevent listing owner from chatting about their own listing
        if (tshirtCheck[0].userId === senderId) {
            return res.status(400).json({ error: 'You cannot initiate a chat about your own listing' });
        }

        // Check if a chat already exists between these users for this tshirt
        const [existingChats] = await pool.promise().query(
            'SELECT * FROM chat WHERE tshirtId = ? AND ' +
            '((senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?))',
            [tshirtId, senderId, receiverId, receiverId, senderId]
        );

        if (existingChats.length > 0) {
            return res.json({ 
                message: 'Chat already exists', 
                chatId: existingChats[0].idMessage 
            });
        }

        // Create initial message in the chat
        const [result] = await pool.promise().query(
            'INSERT INTO chat (senderId, receiverId, tshirtId, message) VALUES (?, ?, ?, ?)',
            [senderId, receiverId, tshirtId, 'Chat initiated']
        );

        res.status(201).json({ 
            message: 'Chat created successfully', 
            chatId: result.insertId 
        });
    } catch (error) {
        console.error('Chat creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Send a message in an existing chat
app.post('/chat/message', async (req, res) => {
    const { senderId, receiverId, tshirtId, message } = req.body;

    // Input validation
    if (!senderId || !receiverId || !tshirtId || !message) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Prevent chatting with self
    if (senderId === receiverId) {
        return res.status(400).json({ error: 'You cannot send a message to yourself' });
    }

    try {
        // Verify the chat exists
        const [chatCheck] = await pool.promise().query(
            'SELECT * FROM chat WHERE tshirtId = ? AND ' +
            '((senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?))',
            [tshirtId, senderId, receiverId, receiverId, senderId]
        );

        if (chatCheck.length === 0) {
            return res.status(404).json({ error: 'Chat does not exist' });
        }

        // Verify message length
        if (message.trim().length === 0) {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        if (message.length > 500) {
            return res.status(400).json({ error: 'Message is too long (max 500 characters)' });
        }

        // Insert the message
        const [result] = await pool.promise().query(
            'INSERT INTO chat (senderId, receiverId, tshirtId, message) VALUES (?, ?, ?, ?)',
            [senderId, receiverId, tshirtId, message]
        );

        res.status(201).json({ 
            message: 'Message sent successfully', 
            messageId: result.insertId 
        });
    } catch (error) {
        console.error('Message sending error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get chat history for a specific listing between two users
app.get('/chat/history', async (req, res) => {
    const { senderId, receiverId, tshirtId } = req.query;

    // Input validation
    if (!senderId || !receiverId || !tshirtId) {
        return res.status(400).json({ error: 'Sender ID, Receiver ID, and Tshirt ID are required' });
    }

    // Prevent chatting with self
    if (senderId === receiverId) {
        return res.status(400).json({ error: 'Invalid chat participants' });
    }

    try {
        // Verify the chat exists
        const [chatCheck] = await pool.promise().query(
            'SELECT * FROM chat WHERE tshirtId = ? AND ' +
            '((senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?))',
            [tshirtId, senderId, receiverId, receiverId, senderId]
        );

        if (chatCheck.length === 0) {
            return res.status(404).json({ error: 'Chat does not exist' });
        }

        // Fetch chat messages
        const [messages] = await pool.promise().query(`
            SELECT 
                c.*,
                u.fname AS senderFirstName,
                u.lname AS senderLastName
            FROM chat c
            JOIN users u ON c.senderId = u.idUsers
            WHERE c.tshirtId = ? AND (
                (c.senderId = ? AND c.receiverId = ?) OR 
                (c.senderId = ? AND c.receiverId = ?)
            )
            ORDER BY c.sentAt ASC
        `, [tshirtId, senderId, receiverId, receiverId, senderId]);

        res.json(messages);
    } catch (error) {
        console.error('Fetching chat history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/chat/list/:userId', async (req, res) => {
    const userId = req.params.userId;
    console.log(`Received request for chat list. User ID: ${userId}`);
    
    // Input validation
    if (!userId) {
        console.error('Chat list request: No user ID provided');
        return res.status(400).json({ error: 'User ID is required' });
    }

    try {
        // Verify user exists
        const [userCheck] = await pool.promise().query(
            'SELECT * FROM users WHERE idUsers = ?',
            [userId]
        );

        if (userCheck.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Fetch unique chats for the user
        const [chats] = await pool.promise().query(`
            WITH UserChats AS (
                SELECT DISTINCT 
                    t.idTShirt,
                    (SELECT imageUrl FROM tshirt_images WHERE tshirtId = t.idTShirt ORDER BY id ASC LIMIT 1) AS imageUrl,
                    b.name AS bandName,
                    t.size,
                    CASE 
                        WHEN c.senderId = ? THEN c.receiverId
                        ELSE c.senderId
                    END AS otherUserId,
                    MAX(c.sentAt) AS lastMessageTime
                FROM chat c
                JOIN tshirts t ON c.tshirtId = t.idTShirt
                JOIN bands b ON t.bandId = b.idBand
                WHERE c.senderId = ? OR c.receiverId = ?
                GROUP BY t.idTShirt, otherUserId
            )
            SELECT 
                uc.*,
                u.fname AS otherUserFirstName,
                u.lname AS otherUserLastName,
                (
                    SELECT message 
                    FROM chat 
                    WHERE tshirtId = uc.idTShirt AND 
                          ((senderId = ? AND receiverId = uc.otherUserId) OR 
                           (senderId = uc.otherUserId AND receiverId = ?))
                    ORDER BY sentAt DESC 
                    LIMIT 1
                ) AS lastMessage
            FROM UserChats uc
            JOIN users u ON uc.otherUserId = u.idUsers
            ORDER BY uc.lastMessageTime DESC
        `, [userId, userId, userId, userId, userId]);

        res.json(chats);
    } catch (error) {
        console.error('Detailed error fetching chat list:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message 
        });
    }
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
