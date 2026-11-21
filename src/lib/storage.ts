/**
 * QuickHire Egypt — Cloud Storage Client Utility
 * Handles asset uploading to Supabase Storage via secure serverless endpoint (/api/upload).
 */

export async function uploadCandidateAsset({
  file,
  bucket,
  candidateId,
  fileName,
}: {
  file: File | Blob;
  bucket: "resumes" | "voice-notes";
  candidateId?: string;
  fileName?: string;
}): Promise<{ publicUrl: string; path: string } | null> {
  try {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bucket,
        fileName: fileName || (file instanceof File ? file.name : undefined),
        fileData: base64Data,
        candidateId,
        contentType: file.type,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.publicUrl) {
        return {
          publicUrl: data.publicUrl as string,
          path: data.path as string,
        };
      }
    } else {
      console.warn(`[QuickHire Storage] /api/upload returned ${res.status}:`, await res.text());
    }
  } catch (err) {
    console.warn("[QuickHire Storage] Upload error, falling back to database persistence:", err);
  }

  return null;
}
