import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import * as mediaService from './media.service';

// Configure multer for video uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, mediaService.getMediaDir());
    },
    filename: (req, file, cb) => {
        // Sanitize filename and add timestamp
        const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const timestamp = Date.now();
        const ext = path.extname(sanitized);
        const name = path.basename(sanitized, ext);
        cb(null, `${name}_${timestamp}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB max
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['video/mp4', 'video/webm', 'video/x-matroska', 'video/quicktime'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only video files are allowed.'));
        }
    }
});

export const uploadMiddleware = upload.single('video');

/**
 * Upload video file
 */
export const uploadVideo = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const serverUrl = `${req.protocol}://${req.get('host')}`;
        const videoUrl = mediaService.getVideoUrl(req.file.filename, serverUrl);

        res.json({
            success: true,
            message: 'Video uploaded successfully',
            file: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                url: videoUrl
            }
        });
    } catch (error: any) {
        console.error('Error uploading video:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * List all videos
 */
export const listVideos = async (req: Request, res: Response) => {
    try {
        const folder = req.query.folder as string | undefined;
        const videos = await mediaService.listVideos(folder);

        res.json({
            success: true,
            videos,
            count: videos.length
        });
    } catch (error: any) {
        console.error('Error listing videos:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Delete video
 */
export const deleteVideo = async (req: Request, res: Response) => {
    try {
        const { filename } = req.params;

        if (!filename) {
            return res.status(400).json({ error: 'Filename is required' });
        }

        await mediaService.deleteVideo(filename);

        res.json({
            success: true,
            message: `Video ${filename} deleted successfully`
        });
    } catch (error: any) {
        console.error('Error deleting video:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Create folder
 */
export const createFolder = async (req: Request, res: Response) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Folder name is required' });
        }

        await mediaService.createFolder(name);

        res.json({
            success: true,
            message: `Folder ${name} created successfully`
        });
    } catch (error: any) {
        console.error('Error creating folder:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get player URL
 */
export const getPlayerUrl = async (req: Request, res: Response) => {
    try {
        const { playlist, loop } = req.body;

        if (!playlist || !Array.isArray(playlist) || playlist.length === 0) {
            return res.status(400).json({ error: 'Playlist is required and must be a non-empty array' });
        }

        const serverUrl = `${req.protocol}://${req.get('host')}`;
        const playerUrl = mediaService.getPlayerUrl(serverUrl, playlist, loop === true);

        res.json({
            success: true,
            playerUrl
        });
    } catch (error: any) {
        console.error('Error generating player URL:', error);
        res.status(500).json({ error: error.message });
    }
};
