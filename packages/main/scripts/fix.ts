import { Project } from "ts-morph";
import path from "path";
import fs from "fs";

// Absolute path to your project's "src" folder
const srcPath = path.resolve("src");

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
  skipAddingFilesFromTsConfig: false,
});

const sourceFiles = project.getSourceFiles(["src/**/*.ts", "src/**/*.tsx"]);

console.log(`Found ${sourceFiles.length} files`);

sourceFiles.forEach((sourceFile) => {
  const filePath = sourceFile.getFilePath();

  const imports = sourceFile.getImportDeclarations();

  imports.forEach((importDecl) => {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();

    // Only transform "src/..." imports
    if (moduleSpecifier.startsWith("src/")) {
      const absoluteImportPath = path.resolve(srcPath, moduleSpecifier.replace(/^src\//, ""));
      const relativePath = path.relative(path.dirname(filePath), absoluteImportPath);

      // Normalize path for TypeScript
      let newPath = relativePath.replace(/\\/g, "/");
      if (!newPath.startsWith(".")) {
        newPath = "./" + newPath;
      }

      importDecl.setModuleSpecifier(newPath);
      console.log(`✔ Updated import in ${filePath}: '${moduleSpecifier}' → '${newPath}'`);
    }
  });
});

// Save all changes
project.save().then(() => {
  console.log("✅ All imports updated!");
});
