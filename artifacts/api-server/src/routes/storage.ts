import { Readable } from 'stream';
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from '@workspace/api-zod';
import { Router, type IRouter, type Request, type Response } from 'express';
import { getAuth } from '@clerk/express';

import {
  ObjectNotFoundError,
  ObjectStorageService,
} from '../lib/objectStorage';
import { isBlobConfigured, uploadToBlob } from '../lib/blobStorage';
import { logger } from '../lib/logger';

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

function requireStorageAuth(req: Request, res: Response): boolean {
  if (getAuth(req).userId) {
    return true;
  }
  res.status(401).json({ error: 'Unauthorized' });
  return false;
}

router.post(
  '/storage/uploads/request-url',
  async (req: Request, res: Response) => {
    if (!requireStorageAuth(req, res)) {
      return;
    }

    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Missing or invalid required fields' });
      return;
    }

    try {
      const { name, size, contentType } = parsed.data;
      if (!contentType.startsWith('image/')) {
        res.status(415).json({ error: 'Only image files are supported' });
        return;
      }

      if (isBlobConfigured()) {
        res.json(
          RequestUploadUrlResponse.parse({
            uploadURL: '',
            objectPath: `blob://${name}`,
            metadata: { name, size, contentType },
          }),
        );
        return;
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath =
        objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        }),
      );
    } catch (error) {
      logger.error({ err: error }, 'Error generating upload URL');
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  },
);

router.post('/storage/uploads/direct', async (req: Request, res: Response) => {
  if (!requireStorageAuth(req, res)) {
    return;
  }
  if (!isBlobConfigured()) {
    res.status(503).json({ error: 'Vercel Blob is not configured' });
    return;
  }
  try {
    const dataUrl = String(req.body?.dataUrl || '');
    const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
    if (!match) {
      res.status(400).json({ error: 'Expected a base64 data URL' });
      return;
    }
    const contentType = req.body?.contentType || match[1] || 'image/jpeg';
    const bytes = Buffer.from(match[2], 'base64');
    const name = req.body?.name || `upload-${Date.now()}.jpg`;
    const hosted = await uploadToBlob({
      data: bytes,
      contentType,
      filename: `adforge/uploads/${name}`,
    });
    res.status(201).json({
      url: hosted.url,
      objectPath: hosted.pathname,
      previewUrl: hosted.url,
    });
  } catch (error) {
    logger.error({ err: error }, 'Direct blob upload failed');
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.get(
  '/storage/public-objects/*filePath',
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join('/') : raw;
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const response = await objectStorageService.downloadObject(file);

      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      logger.error({ err: error }, 'Error serving public object');
      res.status(500).json({ error: 'Failed to serve public object' });
    }
  },
);

router.get('/storage/objects/*path', async (req: Request, res: Response) => {
  if (!requireStorageAuth(req, res)) {
    return;
  }

  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join('/') : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile =
      await objectStorageService.getObjectEntityFile(objectPath);

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(
        response.body as ReadableStream<Uint8Array>,
      );
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      logger.warn({ err: error }, 'Object not found');
      res.status(404).json({ error: 'Object not found' });
      return;
    }
    logger.error({ err: error }, 'Error serving object');
    res.status(500).json({ error: 'Failed to serve object' });
  }
});

export default router;
