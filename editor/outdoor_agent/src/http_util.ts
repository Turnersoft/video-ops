export type MultipartPart = {
  fileName?: string;
  contentType?: string;
  data: Uint8Array;
};

export function parseMultipart(body: Uint8Array, boundary: string): Map<string, MultipartPart> {
  const textDecoder = new TextDecoder();
  const textEncoder = new TextEncoder();
  const delimiter = textEncoder.encode(`--${boundary}`);
  const parts = new Map<string, MultipartPart>();
  let offset = 0;

  const indexOf = (haystack: Uint8Array, needle: Uint8Array, from = 0): number => {
    outer: for (let index = from; index <= haystack.length - needle.length; index += 1) {
      for (let inner = 0; inner < needle.length; inner += 1) {
        if (haystack[index + inner] !== needle[inner]) {
          continue outer;
        }
      }
      return index;
    }
    return -1;
  };

  while (offset < body.length) {
    const start = indexOf(body, delimiter, offset);
    if (start < 0) {
      break;
    }
    let cursor = start + delimiter.length;
    if (body[cursor] === 45 && body[cursor + 1] === 45) {
      break;
    }
    if (body[cursor] === 13 && body[cursor + 1] === 10) {
      cursor += 2;
    }
    const headerMarker = textEncoder.encode('\r\n\r\n');
    const headerEnd = indexOf(body, headerMarker, cursor);
    if (headerEnd < 0) {
      break;
    }
    const headerText = textDecoder.decode(body.slice(cursor, headerEnd));
    const dataStart = headerEnd + 4;
    const next = indexOf(body, delimiter, dataStart);
    const dataEnd = next >= 0 ? next - 2 : body.length;
    const data = body.slice(dataStart, dataEnd);
    const nameMatch = /name="([^"]+)"/.exec(headerText);
    const fileNameMatch = /filename="([^"]+)"/.exec(headerText);
    const contentTypeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(headerText);
    if (nameMatch) {
      parts.set(nameMatch[1], {
        fileName: fileNameMatch?.[1],
        contentType: contentTypeMatch?.[1]?.trim(),
        data,
      });
    }
    offset = next >= 0 ? next : body.length;
  }
  return parts;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Range, ngrok-skip-browser-warning, Ngrok-Skip-Browser-Warning',
  'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Length, Content-Range, Content-Type',
};

function contentTypeForPath(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  switch (ext) {
    case '.html':
    case '.htm':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.mp4':
      return 'video/mp4';
    case '.json':
      return 'application/json';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webm':
      return 'video/webm';
    case '.mov':
      return 'video/quicktime';
    case '.wav':
      return 'audio/wav';
    default:
      return 'application/octet-stream';
  }
}

function parseByteRange(
  rangeHeader: string,
  size: number,
): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match || size <= 0) {
    return null;
  }
  const hasStart = match[1].length > 0;
  const hasEnd = match[2].length > 0;
  if (!hasStart && !hasEnd) {
    return null;
  }
  let start = 0;
  let end = size - 1;
  if (!hasStart && hasEnd) {
    // bytes=-N → last N bytes
    const suffix = Number(match[2]);
    if (!Number.isFinite(suffix) || suffix <= 0) {
      return null;
    }
    start = Math.max(0, size - suffix);
  } else {
    start = Number(match[1]);
    end = hasEnd ? Number(match[2]) : size - 1;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= size || end < start) {
    return null;
  }
  return { start, end: Math.min(end, size - 1) };
}

/** Stream a byte range from an open file without loading the whole file into memory. */
function rangedFileStream(file: Deno.FsFile, start: number, length: number): ReadableStream<Uint8Array> {
  file.seekSync(start, Deno.SeekMode.Start);
  let remaining = length;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (remaining <= 0) {
        controller.close();
        try {
          file.close();
        } catch {
          // already closed
        }
        return;
      }
      const chunkSize = Math.min(64 * 1024, remaining);
      const buffer = new Uint8Array(chunkSize);
      const bytesRead = await file.read(buffer);
      if (bytesRead === null || bytesRead === 0) {
        controller.close();
        try {
          file.close();
        } catch {
          // already closed
        }
        return;
      }
      remaining -= bytesRead;
      controller.enqueue(buffer.subarray(0, bytesRead));
    },
    cancel() {
      try {
        file.close();
      } catch {
        // already closed
      }
    },
  });
}

/**
 * Serve a file from disk with streaming + HTTP Range support (needed for <video> seeking).
 * Does not load the whole file into memory.
 */
export function fileResponse(filePath: string, request?: Request): Response {
  const contentType = contentTypeForPath(filePath);
  const fileInfo = Deno.statSync(filePath);
  const size = fileInfo.size;
  const method = request?.method?.toUpperCase() ?? 'GET';
  const rangeHeader = request?.headers.get('range');

  const baseHeaders: Record<string, string> = {
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=0, must-revalidate',
    ...corsHeaders,
  };

  if (rangeHeader) {
    const range = parseByteRange(rangeHeader, size);
    if (!range) {
      return new Response(null, {
        status: 416,
        headers: {
          ...baseHeaders,
          'Content-Range': `bytes */${size}`,
        },
      });
    }
    const length = range.end - range.start + 1;
    const headers = {
      ...baseHeaders,
      'Content-Length': String(length),
      'Content-Range': `bytes ${range.start}-${range.end}/${size}`,
    };
    if (method === 'HEAD') {
      return new Response(null, { status: 206, headers });
    }
    const file = Deno.openSync(filePath, { read: true });
    return new Response(rangedFileStream(file, range.start, length), {
      status: 206,
      headers,
    });
  }

  const headers = {
    ...baseHeaders,
    'Content-Length': String(size),
  };
  if (method === 'HEAD') {
    return new Response(null, { status: 200, headers });
  }
  const file = Deno.openSync(filePath, { read: true });
  return new Response(file.readable, {
    status: 200,
    headers,
  });
}

export function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders },
  });
}

export function optionsResponse(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (!text.length) {
    return {};
  }
  return JSON.parse(text) as Record<string, unknown>;
}
