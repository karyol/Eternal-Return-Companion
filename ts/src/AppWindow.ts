import { OWWindow } from "@overwolf/overwolf-api-ts";

// A base class for the app's foreground windows.
// Sets the modal and drag behaviors, which are shared accross the desktop and in-game windows.
export class AppWindow {
  protected currWindow: OWWindow;
  protected mainWindow: OWWindow;
  protected maximized: boolean = false;

  constructor(windowName) {
    this.mainWindow = new OWWindow('background');
    this.currWindow = new OWWindow(windowName);

    const closeButton = document.getElementById(windowName + 'closeButton');
    const maximizeButton = document.getElementById(windowName + 'maximizeButton');
    const minimizeButton = document.getElementById(windowName + 'minimizeButton');

    const header = document.getElementById(windowName + 'header');

    this.setDrag(header);

    closeButton.addEventListener('click', () => {
      this.mainWindow.close();
    });

    minimizeButton.addEventListener('click', () => {
      this.currWindow.minimize();
    });

    maximizeButton.addEventListener('click', () => {
      if (!this.maximized) {
        this.currWindow.maximize();
      } else {
        this.currWindow.restore();
      }

      this.maximized = !this.maximized;
    });
  }

  public async getWindowState() {
    return await this.currWindow.getWindowState();
  }

  private async setDrag(elem) {
    this.currWindow.dragMove(elem);
  }
}
