import math


class H3LiveResolution:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE", {"tooltip": "Image whose aspect ratio is used by the calculate button."}),
                "megapixels": (
                    "FLOAT",
                    {
                        "default": 1.5,
                        "min": 0.1,
                        "max": 16.0,
                        "step": 0.1,
                        "tooltip": "Target pixel area used when the calculate button fills width and height.",
                    },
                ),
                "width": (
                    "INT",
                    {
                        "default": 1024,
                        "min": 32,
                        "max": 16384,
                        "step": 32,
                        "tooltip": "Editable output width. The calculate button fills this value.",
                    },
                ),
                "height": (
                    "INT",
                    {
                        "default": 1024,
                        "min": 32,
                        "max": 16384,
                        "step": 32,
                        "tooltip": "Editable output height. The calculate button fills this value.",
                    },
                ),
                "multiple": (
                    "INT",
                    {
                        "default": 32,
                        "min": 8,
                        "max": 128,
                        "step": 8,
                        "advanced": True,
                        "tooltip": "Width and height are rounded to the nearest multiple. MiniMax H3 normally uses 32.",
                    },
                ),
            }
        }

    RETURN_TYPES = ("INT", "INT", "STRING")
    RETURN_NAMES = ("width", "height", "resolution_info")
    FUNCTION = "resolve"
    CATEGORY = "MiniMax H3/utilities"
    DESCRIPTION = "Fill editable H3 width and height from an input image and target megapixels using the button on the node."

    @staticmethod
    def _snap(value, multiple):
        return max(multiple, int(math.floor(value / multiple + 0.5)) * multiple)

    def resolve(self, image, megapixels, width, height, multiple):
        source_height = int(image.shape[1])
        source_width = int(image.shape[2])
        multiple = max(1, int(multiple))
        width = self._snap(int(width), multiple)
        height = self._snap(int(height), multiple)
        actual_mp = width * height / 1_000_000
        info = f"Source {source_width}x{source_height} -> Output {width}x{height} ({actual_mp:.2f} MP, target {float(megapixels):.2f} MP)"
        return (width, height, info)


NODE_CLASS_MAPPINGS = {"H3LiveResolution": H3LiveResolution}
NODE_DISPLAY_NAME_MAPPINGS = {"H3LiveResolution": "H3 MP Resolution"}
