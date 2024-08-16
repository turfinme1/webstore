import fsPromises from "fs/promises";

export default async function isDirectoryAlreadyCreated(path) {
  try {
    await fsPromises.access(path);
    console.log(`Directory exists: ${path}`);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}
