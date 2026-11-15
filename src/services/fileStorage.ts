import { familyDataSchema } from "@/src/schema/family";
import type { FamilyData, FolderDirectoryHandle } from "@/src/types/family";

export interface WritableFamilyFileHandle {
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<{
    write: (data: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
}

export interface LoadedFamilyFile {
  family: FamilyData;
  fileName: string;
  handle: WritableFamilyFileHandle | null;
}

interface FilePickerWindow extends Window {
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<WritableFamilyFileHandle[]>;
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<WritableFamilyFileHandle>;
}

const jsonPickerTypes = [
  {
    description: "Family JSON",
    accept: {
      "application/json": [".json"],
    },
  },
];

const importPickerTypes = [{
  description: "Silsilah keluarga (JSON / TXT)",
  accept: { "application/json": [".json"], "text/plain": [".txt"] },
}];

const getPickerWindow = (): FilePickerWindow | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return window as FilePickerWindow;
};

const formatZodError = (error: { issues: Array<{ path: PropertyKey[]; message: string }> }) =>
  error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
      return `${path}${issue.message}`;
    })
    .join("\n");

export const parseFamilyJSON = (contents: string): FamilyData => {
  if (!contents.trim()) throw new Error("Data JSON masih kosong. Tempel JSON silsilah terlebih dahulu.");
  let parsed: unknown;

  try {
    parsed = JSON.parse(contents.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("JSON belum valid. Periksa tanda kutip, koma, dan kurung pada teks JSON.");
  }

  const result = familyDataSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(`Data silsilah belum sesuai format Markoum:\n${formatZodError(result.error)}`);
  }

  return result.data;
};

const readBrowserFile = (file: File, handle: WritableFamilyFileHandle | null) =>
  new Promise<LoadedFamilyFile>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("error", () => {
      reject(new Error("Could not read the selected file."));
    });

    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") {
        reject(new Error("The selected file could not be read as text."));
        return;
      }

      try {
        resolve({
          family: parseFamilyJSON(reader.result),
          fileName: file.name,
          handle,
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Could not parse family file."));
      }
    });

    reader.readAsText(file);
  });

const loadViaInput = () =>
  new Promise<LoadedFamilyFile>((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,text/plain,.json,.txt";

    input.addEventListener("change", () => {
      const file = input.files?.item(0);

      if (!file) {
        reject(new Error("No file was selected."));
        return;
      }

      readBrowserFile(file, null).then(resolve).catch(reject);
    });

    input.click();
  });

export const loadJSONFile = async (): Promise<LoadedFamilyFile> => {
  const pickerWindow = getPickerWindow();

  if (pickerWindow?.showOpenFilePicker) {
    const [handle] = await pickerWindow.showOpenFilePicker({
      multiple: false,
      types: importPickerTypes,
    });

    if (!handle) {
      throw new Error("No file was selected.");
    }

    const file = await handle.getFile();
    return readBrowserFile(file, handle);
  }

  return loadViaInput();
};

const downloadJSON = (family: FamilyData, fileName: string) => {
  const blob = new Blob([JSON.stringify(family, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const saveJSONFile = async (
  family: FamilyData,
  handle: WritableFamilyFileHandle | null,
  fileName = "family.json",
): Promise<WritableFamilyFileHandle | null> => {
  const validatedFamily = familyDataSchema.parse({
    ...family,
    updatedAt: new Date().toISOString(),
  });
  const contents = JSON.stringify(validatedFamily, null, 2);
  const pickerWindow = getPickerWindow();

  if (handle) {
    const writable = await handle.createWritable();
    await writable.write(contents);
    await writable.close();
    return handle;
  }

  if (pickerWindow?.showSaveFilePicker) {
    const nextHandle = await pickerWindow.showSaveFilePicker({
      suggestedName: fileName,
      types: jsonPickerTypes,
    });
    const writable = await nextHandle.createWritable();
    await writable.write(contents);
    await writable.close();
    return nextHandle;
  }

  downloadJSON(validatedFamily, fileName);
  return null;
};

export const exportFamily = (family: FamilyData): void => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  downloadJSON(
    familyDataSchema.parse({ ...family, updatedAt: new Date().toISOString() }),
    `family-backup-${timestamp}.json`,
  );
};

export const loadFamilyFromDirectory = async (dirHandle: FolderDirectoryHandle): Promise<FamilyData> => {
  const fileHandle = await dirHandle.getFileHandle("family.json");
  const file = await fileHandle.getFile();
  const text = await file.text();
  return parseFamilyJSON(text);
};

export const saveFamilyToDirectory = async (dirHandle: FolderDirectoryHandle, family: FamilyData): Promise<void> => {
  const validatedFamily = familyDataSchema.parse({
    ...family,
    updatedAt: new Date().toISOString(),
  });
  const fileHandle = await dirHandle.getFileHandle("family.json", { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(validatedFamily, null, 2));
  await writable.close();
};
