import {
  OWGames,
  OWGamesEvents,
  OWHotkeys
} from "@overwolf/overwolf-api-ts";

import { AppWindow } from "../AppWindow";
import { kHotkeys, kWindowNames, kGamesFeatures, kERCharacterIDS, kERWeaponIDS, kERCharacterWeapons } from "../consts";

import WindowState = overwolf.windows.WindowStateEx;

// The window displayed in-game while a game is running.
// It listens to all info events and to the game events listed in the consts.ts file
// and writes them to the relevant log using <pre> tags.
// The window also sets up Ctrl+F as the minimize/restore hotkey.
// Like the background window, it also implements the Singleton design pattern.
class InGame extends AppWindow {
  private static _instance: InGame;
  private _gameEventsListener: OWGamesEvents;
  private _eventsLog: HTMLElement;
  private _infoLog: HTMLElement;
  private _mainContainer: HTMLElement;
  private _selectedCharacter: HTMLElement;
  private _selectedCharacterID: number;
  private _selectedCharacterName: string;

  private constructor() {
    super(kWindowNames.inGame);

    this._eventsLog = document.getElementById('eventsLog');
    this._infoLog = document.getElementById('infoLog');
    this._mainContainer = document.getElementById('other');
    this._selectedCharacter = document.getElementById('selectedCharacter');

    this.setToggleHotkeyBehavior();
    this.setToggleHotkeyText();
  }

  public static instance() {
    if (!this._instance) {
      this._instance = new InGame();
    }

    return this._instance;
  }

  public async run() {
    const gameClassId = await this.getCurrentGameClassId();

    const gameFeatures = kGamesFeatures.get(gameClassId);

    if (gameFeatures && gameFeatures.length) {
      this._gameEventsListener = new OWGamesEvents(
        {
          onInfoUpdates: this.onInfoUpdates.bind(this),
          onNewEvents: this.onNewEvents.bind(this)
        },
        gameFeatures
      );

      this._gameEventsListener.start();
    }
  }

  private onInfoUpdates(info) {
    this.logLine(this._infoLog, info, false);
  }

  // Special events will be highlighted in the event log
  private onNewEvents(e) {
    const shouldHighlight = e.events.some(event => {
      switch (event.name) {
        case 'select_character':
        case 'select_weapon':
        case 'select_trait':
          return true;
      }

      return false
    });
    this.logLine(this._eventsLog, e, shouldHighlight);

    switch (e.events[0].name) {
      case "select_character":
        this._selectedCharacter.innerHTML = '';
        const divInline = document.createElement('div');
        divInline.className = "inline";

        const selectedCharacter = document.createElement('h1');
        this._selectedCharacterID = parseInt(e.events[0].data);
        this._selectedCharacterName = kERCharacterIDS[parseInt(e.events[0].data) - 1];
        selectedCharacter.textContent = this._selectedCharacterName;

        const characterImage = document.createElement('img');
        characterImage.src = "https://cdn.dak.gg/er/game-assets/0.60.0/character/CharCommunity_" + this._selectedCharacterName + "_S000.png"

        const selectedWeapon = document.createElement('div');
        selectedWeapon.id = "selectedWeapon";

        divInline.appendChild(characterImage);
        divInline.appendChild(selectedCharacter);
        divInline.appendChild(selectedWeapon);
        this._selectedCharacter.appendChild(divInline);
        break;

      case "select_weapon":
        const characterWeapon = kERCharacterWeapons[this._selectedCharacterID - 1];
        const weaponName = kERWeaponIDS[characterWeapon[e.events[0].data.substr(this._selectedCharacterID.toString().length) - 1]];
        document.getElementById('selectedWeapon').textContent = weaponName;
        const url = "https://dak.gg/bser/characters/" + this._selectedCharacterName + "?teamMode=SOLO&weaponType=" + weaponName;
        break;
      
      default:
        // document.getElementById('selectedWeapon').textContent = JSON.stringify(e.events[0]);
        break;
    }

    
  }

  // Displays the toggle minimize/restore hotkey in the window header
  private async setToggleHotkeyText() {
    const gameClassId = await this.getCurrentGameClassId();
    const hotkeyText = await OWHotkeys.getHotkeyText(kHotkeys.toggle, gameClassId);
    const hotkeyElem = document.getElementById('hotkey');
    hotkeyElem.textContent = hotkeyText;
  }

  // Sets toggleInGameWindow as the behavior for the Ctrl+F hotkey
  private async setToggleHotkeyBehavior() {
    const toggleInGameWindow = async (
      hotkeyResult: overwolf.settings.hotkeys.OnPressedEvent
    ): Promise<void> => {
      console.log(`pressed hotkey for ${hotkeyResult.name}`);
      const inGameState = await this.getWindowState();

      if (inGameState.window_state === WindowState.NORMAL ||
        inGameState.window_state === WindowState.MAXIMIZED) {
        this.currWindow.minimize();
      } else if (inGameState.window_state === WindowState.MINIMIZED ||
        inGameState.window_state === WindowState.CLOSED) {
        this.currWindow.restore();
      }
    }

    OWHotkeys.onHotkeyDown(kHotkeys.toggle, toggleInGameWindow);
  }

  // Appends a new line to the specified log
  private logLine(log: HTMLElement, data, highlight) {
    const line = document.createElement('pre');
    line.textContent = JSON.stringify(data);

    // if (log == this._eventsLog) {
    //   switch (data.events[0].name) {
    //     case "select_character":
    //       line.textContent = JSON.stringify(data);
    //       break;
    //     case "matching_start":
    //       var gameMode = data.events[0].data.split(',')[1].split(':')[1];
    //       gameMode = gameMode.substr(1, gameMode.length - 3);
    //       if (gameMode == "cobalt") {
    //         line.textContent = "cobalt";
    //         console.log("cobalt");
    //       } else {
    //         line.textContent = JSON.stringify(data);
    //       }
    //       break;
    //     default:
    //       line.textContent = JSON.stringify(data);
    //       break;
    //   }
    // }

    if (log == this._eventsLog && data.events[0].name == "select_weapon") {
      line.textContent = kERCharacterWeapons[this._selectedCharacterID - 1].toString();
      // line.textContent = "https://dak.gg/bser/characters/" + this._selectedCharacterName + "?teamMode=SOLO&weaponType=" + kERWeaponIDS[parseInt(data.events[0].data)];
    }

    if (highlight) {
      line.className = 'highlight';
    }

    // Check if scroll is near bottom
    const shouldAutoScroll =
      log.scrollTop + log.offsetHeight >= log.scrollHeight - 10;

    log.appendChild(line);

    if (shouldAutoScroll) {
      log.scrollTop = log.scrollHeight;
    }
  }

  private async getCurrentGameClassId(): Promise<number | null> {
    const info = await OWGames.getRunningGameInfo();

    return (info && info.isRunning && info.classId) ? info.classId : null;
  }
}

InGame.instance().run();
