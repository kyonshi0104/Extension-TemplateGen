import { TemplateGen, ManifestGen, updateIconPreview } from "./index.js";

const previewCode = document.querySelector('#manifest_preview code');
const inputs = document.querySelectorAll('input[type="text"], input[type="checkbox"]');

previewCode.textContent = ManifestGen();

document.getElementById("image_input").addEventListener("change", updateIconPreview);

// object-fit radio buttons
document.getElementById("fill").addEventListener("change", updateIconPreview);
document.getElementById("contain").addEventListener("change", updateIconPreview);
document.getElementById("cover").addEventListener("change", updateIconPreview);

// icon enabled checkbox
document.getElementById("icon_enabled").addEventListener("change", updateIconPreview);


inputs.forEach(input => {
    input.addEventListener('input', () => {
        const manifest = ManifestGen();
        previewCode.textContent = manifest;
    });
});

document.getElementById("generate").addEventListener("click", async () => {
    const nameInput = document.querySelector('input[data-type="extension_name"]').value || "extension";

    const fileName = nameInput.toLowerCase().trim().replace(/\s+/g, "-");
    const blob = await TemplateGen();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.zip`;
    a.click();

    URL.revokeObjectURL(url);
});
