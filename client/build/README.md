# Build Assets for TidalFlow NSIS Installer

## Required Files

- `icon.ico` - Application icon (256x256, multi-resolution ICO format)
  - Used for: installer icon, uninstaller icon, installer header icon
- `installerSidebar.bmp` - Sidebar image for installer wizard (164x314 pixels, BMP format)
  - Optional: improves installer visual experience
- `uninstallerSidebar.bmp` - Sidebar image for uninstaller wizard (164x314 pixels, BMP format)
  - Optional: improves uninstaller visual experience

## How to Generate

1. Export a 256x256 PNG from your design tool
2. Use an ICO converter (e.g., https://convertico.com/) to create icon.ico
3. For sidebar BMPs, create 164x314 pixel images with your brand colors

## Notes

- electron-builder will skip missing optional assets gracefully
- The installer will work without sidebar images
- `icon.ico` is strongly recommended for a professional appearance
