export function ManifestGen() {
    const extensionName = document.querySelector('input[data-type="extension_name"]').value || "My Extension";
    const extensionVersion = document.querySelector('input[data-type="version"]').value || "0.1.0";
    const extensionDescription = document.querySelector('input[data-type="description"]').value || "";

    // background
    const includeBackground = document.getElementById("background").checked;

    // permissions
    const permissionNodes = document.querySelectorAll('#permissions input.checkbox');
    const permissions = [...permissionNodes]
        .filter(el => el.checked)
        .map(el => el.id.replace("perm-", ""));

    // host permissions
    const hostPermissions = [];

    if (document.getElementById("host-all").checked) {
        hostPermissions.push("*://*/*");
    }

    const customHostRaw = document.getElementById("host-custom").value.trim();

    if (customHostRaw) {
        const hosts = customHostRaw
            .split(",")
            .map(h => h.trim())
            .filter(h => h.length > 0);

        hostPermissions.push(...hosts);
    }

    // icons
    const includeIcons = document.getElementById("icon_enabled").checked;

    // manifest object
    const manifest = {
        manifest_version: 3,
        name: extensionName,
        version: extensionVersion,
        description: extensionDescription,
        permissions: permissions,
        host_permissions: hostPermissions,
        action: {
            default_popup: "ui/popup.html"
        }
    };

    // background
    if (includeBackground) {
        manifest.background = {
            service_worker: "background/service-worker.js",
            type: "module"
        };
    }

    // icons
    if (includeIcons) {
        manifest.icons = {
            "16": "assets/icon-16.png",
            "48": "assets/icon-48.png",
            "128": "assets/icon-128.png"
        };
        manifest.action.default_icon = {
            "16": "assets/icon-16.png",
            "32": "assets/icon-32.png"
        };
    }

    return JSON.stringify(manifest, null, 4);
}

async function IconsGen() {
    const iconEnabled = document.getElementById("icon_enabled").checked;
    if (!iconEnabled) {
        return {};
    }

    let fitMode = "fill";
    if (document.getElementById("contain").checked) {
        fitMode = "contain";
    } else if (document.getElementById("cover").checked) {
        fitMode = "cover";
    }

    const input = document.getElementById("image_input");
    let imageFile = input?.files?.[0];

    if (!imageFile) {
        imageFile = await fetch("./res/sample_icon.png").then(r => r.blob());
    }

    const imageBitmap = await createImageBitmap(imageFile);

    // target icon sizes
    const sizes = [16, 32, 48, 128];
    const icons = {};

    for (const size of sizes) {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        drawImageWithFit(ctx, imageBitmap, size, size, fitMode);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
        icons[`icon-${size}.png`] = blob;
    }

    return icons;
}

export async function updateIconPreview() {
    const iconEnabled = document.getElementById("icon_enabled").checked;
    if (!iconEnabled) {
        document.getElementById("img_selector").disabled = true;
        return;
    }
    document.getElementById("img_selector").disabled = false;

    let fitMode = "fill";
    if (document.getElementById("contain").checked) {
        fitMode = "contain";
    } else if (document.getElementById("cover").checked) {
        fitMode = "cover";
    }

    const input = document.getElementById("image_input");
    let imageFile = input?.files?.[0];

    if (!imageFile) {
        imageFile = await fetch("./res/sample_icon.png").then(r => r.blob());
    }

    const imageBitmap = await createImageBitmap(imageFile);

    const previewImages = [
        { size: 16,  el: document.querySelector('#preview img[data-size="16"]') },
        { size: 32,  el: document.querySelector('#preview img[data-size="32"]') },
        { size: 48,  el: document.querySelector('#preview img[data-size="48"]') },
        { size: 128, el: document.querySelector('#preview img[data-size="128"]') }
    ];


    for (const { size, el } of previewImages) {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        drawImageWithFit(ctx, imageBitmap, size, size, fitMode);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
        const url = URL.createObjectURL(blob);

        el.src = url;
    }
}

function drawImageWithFit(ctx, img, targetW, targetH, fitMode) {
    const imgW = img.width;
    const imgH = img.height;

    const targetRatio = targetW / targetH;
    const imgRatio = imgW / imgH;

    let drawW = targetW;
    let drawH = targetH;
    let offsetX = 0;
    let offsetY = 0;

    if (fitMode === "fill") {
        drawW = targetW;
        drawH = targetH;
    } else if (fitMode === "contain") {
        if (imgRatio > targetRatio) {
            drawW = targetW;
            drawH = targetW / imgRatio;
            offsetY = (targetH - drawH) / 2;
        } else {
            drawH = targetH;
            drawW = targetH * imgRatio;
            offsetX = (targetW - drawW) / 2;
        }
    } else if (fitMode === "cover") {
        if (imgRatio > targetRatio) {
            drawH = targetH;
            drawW = targetH * imgRatio;
            offsetX = (targetW - drawW) / 2;
        } else {
            drawW = targetW;
            drawH = targetW / imgRatio;
            offsetY = (targetH - drawH) / 2;
        }
    }

    ctx.clearRect(0, 0, targetW, targetH);
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
}

export async function TemplateGen() {
    const zip = new JSZip();

    const includeBackground = document.querySelector("#background")?.checked;
    const includeContentScript = document.querySelector("#content-script")?.checked;

    const manifestJson = ManifestGen();
    zip.file("manifest.json", manifestJson);

    const popupHtml = await fetch("./res/default.html").then(r => r.text());
    const uiFolder = zip.folder("ui");
    uiFolder.file("popup.html", popupHtml);
    uiFolder.file("popup.css", "/* default popup css */\n");
    uiFolder.file("popup.js", "// default popup js\n");

    if (includeBackground) {
        zip.folder("background").file(
            "service-worker.js",
            "// default service worker\n"
        );
    }

    if (includeContentScript) {
        zip.folder("content").file(
            "content-script.js",
            "// default content script\n"
        );
    }

    const icons = await IconsGen();
    const assetsFolder = zip.folder("assets");
    for (const [filename, blob] of Object.entries(icons)) {
        assetsFolder.file(filename, blob);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    return blob;
}
