import { fitResolution, snapToMultiple } from "./resolution_math.js";

const { app } = window.comfyAPI.app;

function graphLink(graph, linkId) {
    if (!graph || linkId == null) return null;
    return typeof graph.links?.get === "function" ? graph.links.get(linkId) : graph.links?.[linkId];
}

function connectedSourceNode(node) {
    const imageInput = node.inputs?.find((input) => input.name === "image");
    const link = graphLink(node.graph, imageInput?.link);
    return link ? node.graph?.getNodeById(link.origin_id) : null;
}

function inputImageUrl(node) {
    const sourceNode = connectedSourceNode(node);
    if (!sourceNode) return null;

    const imageWidget = sourceNode.widgets?.find((widget) => widget.name === "image");
    if (imageWidget?.value) {
        const normalized = String(imageWidget.value).replaceAll("\\", "/");
        const slash = normalized.lastIndexOf("/");
        const filename = slash >= 0 ? normalized.slice(slash + 1) : normalized;
        const subfolder = slash >= 0 ? normalized.slice(0, slash) : "";
        return `/view?filename=${encodeURIComponent(filename)}&type=input&subfolder=${encodeURIComponent(subfolder)}`;
    }

    const preview = sourceNode.imgs?.[0];
    return preview?.src || null;
}

async function loadImageSize(url) {
    const image = new Image();
    image.src = url;
    if (typeof image.decode === "function") {
        await image.decode();
    }
    else {
        await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = reject;
        });
    }
    if (!image.naturalWidth || !image.naturalHeight) {
        throw new Error("The image dimensions could not be read.");
    }
    return { width: image.naturalWidth, height: image.naturalHeight };
}

function markChanged(node) {
    node.graph?.setDirtyCanvas?.(true, true);
    node.graph?.change?.();
}

app.registerExtension({
    name: "h3-live-resolution.button",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "H3LiveResolution") return;

        nodeType.prototype.onNodeCreated = function () {
            const node = this;
            const megapixelsWidget = node.widgets?.find((widget) => widget.name === "megapixels");
            const widthWidget = node.widgets?.find((widget) => widget.name === "width");
            const heightWidget = node.widgets?.find((widget) => widget.name === "height");
            const multipleWidget = node.widgets?.find((widget) => widget.name === "multiple");

            const button = node.addWidget("button", "입력 이미지 비율로 계산", null, async () => {
                const url = inputImageUrl(node);
                if (!url) {
                    statusWidget.value = "이미지 입력을 Load Image 노드에 연결해 주세요";
                    markChanged(node);
                    return;
                }

                button.disabled = true;
                statusWidget.value = "이미지 크기를 읽는 중...";
                markChanged(node);
                try {
                    const source = await loadImageSize(url);
                    const result = fitResolution(
                        source.width,
                        source.height,
                        megapixelsWidget.value,
                        multipleWidget.value,
                    );
                    widthWidget.value = result.width;
                    heightWidget.value = result.height;
                    statusWidget.value = `원본 ${source.width}x${source.height} -> 생성 ${result.width}x${result.height} · ${result.actualMegapixels.toFixed(2)} MP`;
                }
                catch (error) {
                    statusWidget.value = `계산 실패: ${error?.message || error}`;
                }
                finally {
                    button.disabled = false;
                    markChanged(node);
                }
            });
            button.options = { ...(button.options || {}), serialize: false };

            const statusWidget = node.addWidget("text", "계산 결과", "이미지와 MP를 정한 뒤 버튼을 누르세요", null, {
                serialize: false,
            });
            statusWidget.disabled = true;

            const updateManualStatus = () => {
                const width = Number(widthWidget.value) || 0;
                const height = Number(heightWidget.value) || 0;
                statusWidget.value = `수동 출력 ${width}x${height} · ${(width * height / 1_000_000).toFixed(2)} MP`;
                markChanged(node);
            };

            for (const widget of [widthWidget, heightWidget]) {
                const originalCallback = widget.callback;
                widget.callback = function (value) {
                    const result = originalCallback?.apply(this, arguments);
                    if (Number(value) > 0) {
                        widget.value = snapToMultiple(value, multipleWidget.value);
                    }
                    updateManualStatus();
                    return result;
                };
            }

            const originalMegapixelsCallback = megapixelsWidget.callback;
            megapixelsWidget.callback = function () {
                const result = originalMegapixelsCallback?.apply(this, arguments);
                statusWidget.value = "MP가 변경되었습니다 · 계산 버튼을 눌러 주세요";
                markChanged(node);
                return result;
            };

            node.setSize([Math.max(node.size[0], 360), Math.max(node.size[1], 250)]);
        };
    },
});
