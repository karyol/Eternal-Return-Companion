import $ from 'jquery';

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
  private _selectedCharacter: HTMLElement;
  private _selectedCharacterID: number;
  private _selectedCharacterName: string;
  private _gameVersion: string;
  private _cobaltBody: HTMLElement;

  private constructor() {
    super(kWindowNames.cobalt);

    overwolf.games.getRunningGameInfo(function(){
        overwolf.windows.changePosition(kWindowNames.cobalt, 
            arguments[0].logicalWidth - 355, 
            arguments[0].logicalHeight / 2 - 135
        );
    });

    this._gameVersion = '0.61.0';
    this._selectedCharacter = document.getElementById('selectedCharacter');
    this._cobaltBody = document.getElementById('dragCobalt');

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

  private onInfoUpdates(info) {}

  // Special events will be highlighted in the event log
  private async onNewEvents(e) {
    switch (e.events[0].name) {
      case "select_character":
        this._cobaltBody.style.backgroundColor = "#33333380";

        this._selectedCharacter.innerHTML = '';
        const divInline = document.createElement('div');
        divInline.className = "inline";

        const selectedCharacter = document.createElement('h1');
        this._selectedCharacterID = parseInt(e.events[0].data);
        this._selectedCharacterName = kERCharacterIDS[parseInt(e.events[0].data) - 1];
        selectedCharacter.textContent = this._selectedCharacterName;

        const characterImage = document.createElement('img');
        characterImage.src = "https://cdn.dak.gg/er/game-assets/" + this._gameVersion + "/character/CharCommunity_" + this._selectedCharacterName + "_S000.png"

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
        const weaponIcon = document.createElement('img');
        weaponIcon.src = "https://cdn.dak.gg/er/game-assets/" + this._gameVersion + "/common_new/Ico_Ability_" + weaponName + ".png";
        document.getElementById('selectedWeapon').appendChild(weaponIcon);

        const url = "https://dak.gg/bser/characters/" + this._selectedCharacterName + "?teamMode=SOLO&weaponType=" + weaponName;

        $.ajax({
          url: url,
          type: 'GET',
          contentType: "text/html",
          crossDomain: true,
          success: (response) => {
            var skillOrder = $($.parseHTML(response)).find(".character-detail__skills")[0].children[0].children[0].children[0];
            document.getElementById('skillOrder').innerHTML = '';
            document.getElementById('skillOrder').appendChild(skillOrder);

            var popularBuilds = $($.parseHTML(response)).find(".item-builds");
            document.getElementById('popularBuilds').innerHTML = '';
            for (const build of popularBuilds) {
              document.getElementById('popularBuilds').appendChild(build);
            }
          }
        });
        break;

      default:
        break;
    }
  }

  // Displays the toggle minimize/restore hotkey in the window header
  private async setToggleHotkeyText() {
    const gameClassId = await this.getCurrentGameClassId();
    const cobaltHotkeyText = await OWHotkeys.getHotkeyText(kHotkeys.toggleCobalt, gameClassId);
    const cobaltHotkeyElem = document.getElementById('cobalt-hotkey');
    cobaltHotkeyElem.textContent = cobaltHotkeyText;
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

    OWHotkeys.onHotkeyDown(kHotkeys.toggleCobalt, toggleInGameWindow);
  }

  private async getCurrentGameClassId(): Promise<number | null> {
    const info = await OWGames.getRunningGameInfo();

    return (info && info.isRunning && info.classId) ? info.classId : null;
  }
}

InGame.instance().run();
