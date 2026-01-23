import fs from 'fs/promises';
import path from 'path';

const MEDIA_DIR = path.join(__dirname, '../../../public/media/videos');

export interface VideoFile {
    filename: string;
    size: number;
    url: string;
    createdAt: Date;
}

/**
 * Ensure media directory exists
 */
async function ensureMediaDir(): Promise<void> {
    try {
        await fs.access(MEDIA_DIR);
    } catch {
        await fs.mkdir(MEDIA_DIR, { recursive: true });
    }
}

/**
 * List all videos in the media directory
 */
export async function listVideos(folder?: string): Promise<VideoFile[]> {
    await ensureMediaDir();

    const targetDir = folder ? path.join(MEDIA_DIR, folder) : MEDIA_DIR;

    try {
        const files = await fs.readdir(targetDir);
        const videoFiles: VideoFile[] = [];

        for (const file of files) {
            const filePath = path.join(targetDir, file);
            const stats = await fs.stat(filePath);

            // Only include video files
            if (stats.isFile() && isVideoFile(file)) {
                const relativePath = folder ? `${folder}/${file}` : file;
                videoFiles.push({
                    filename: file,
                    size: stats.size,
                    url: `/media/videos/${relativePath}`,
                    createdAt: stats.birthtime
                });
            }
        }

        return videoFiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
        console.error('Error listing videos:', error);
        return [];
    }
}

/**
 * Delete a video file
 */
export async function deleteVideo(filename: string): Promise<void> {
    const filePath = path.join(MEDIA_DIR, filename);

    // Security check: ensure file is within media directory
    const resolvedPath = path.resolve(filePath);
    const resolvedMediaDir = path.resolve(MEDIA_DIR);

    if (!resolvedPath.startsWith(resolvedMediaDir)) {
        throw new Error('Invalid file path');
    }

    try {
        await fs.unlink(filePath);
        console.log(`✅ Video deleted: ${filename}`);
    } catch (error: any) {
        console.error(`❌ Error deleting video ${filename}:`, error);
        throw new Error(`Failed to delete video: ${error.message}`);
    }
}

/**
 * Create a subfolder in media directory
 */
export async function createFolder(folderName: string): Promise<void> {
    // Sanitize folder name
    const sanitized = folderName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const folderPath = path.join(MEDIA_DIR, sanitized);

    // Security check
    const resolvedPath = path.resolve(folderPath);
    const resolvedMediaDir = path.resolve(MEDIA_DIR);

    if (!resolvedPath.startsWith(resolvedMediaDir)) {
        throw new Error('Invalid folder path');
    }

    try {
        await fs.mkdir(folderPath, { recursive: true });
        console.log(`✅ Folder created: ${sanitized}`);
    } catch (error: any) {
        console.error(`❌ Error creating folder ${sanitized}:`, error);
        throw new Error(`Failed to create folder: ${error.message}`);
    }
}

/**
 * Get video URL for playback
 */
export function getVideoUrl(filename: string, serverUrl: string): string {
    return `${serverUrl}/media/videos/${filename}`;
}

/**
 * Get player URL with playlist
 */
export function getPlayerUrl(serverUrl: string, playlist: string[], loop: boolean): string {
    const playlistParam = playlist.join(',');
    return `${serverUrl}/media/player.html?playlist=${encodeURIComponent(playlistParam)}&loop=${loop}`;
}

/**
 * Check if file is a video based on extension
 */
function isVideoFile(filename: string): boolean {
    const videoExtensions = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.m4v', '.flv'];
    const ext = path.extname(filename).toLowerCase();
    return videoExtensions.includes(ext);
}

/**
 * Get media directory path
 */
export function getMediaDir(): string {
    return MEDIA_DIR;
}
