const hydraExpress = require('hydra-express');
const hydra = hydraExpress.getHydra();

/**
* @name HotPotatoPlayer
* @summary A class representing our hot potato game player
*/
class HotPotatoPlayer {
  /**
	* @name init
	* @summary Initialize player service
	* @return {undefined}
	*/
  init() {
    this.playerName = hydra.getInstanceID();
    this.gameLog = [];
    this.resolve = null;
    this.reject = null;
    this.isStarter = false;
  }

  /**
  * @name getGameLog
  * @summary retrieve game log
  * @return {array} array of game log entries
  */
  getGameLog() {
    return this.gameLog;
  }

  /**
	* @name messageHandler
	* @summary handle incoming messages
	* @param {object} message - message object
	* @return {undefined}
	*/
  messageHandler(message) {
    if (message.typ !== 'hotpotato') {
      return;
    }
    if (message.bdy.expiration < Math.floor(Date.now() / 1000)) {
      let gameOverMessage = hydra.createUMFMessage({
        to: 'hpp:/',
        frm: 'hpp:/',
        typ: 'hotpotato',
        bdy: {
          command: 'gameover',
          result: `Game over, ${this.playerName} lost!`
        }
      });
      hydra.sendBroadcastMessage(gameOverMessage);
    } else if (message.bdy.command === 'gameover') {
      this.gameOver(message.bdy.result);
    } else {
      this.gameLog.push(`[${this.playerName}]: received hot potato.`);
      this.passHotPotato(message);
    }
  }

  /**
	* @name getRandomWait
	* @summary Return a number from min (inclusive) to max (inclusive)
	* @param {number} min - minimum wait value
	* @param {number} max - maximum wait value
	* @return {number} result - random delay
	*/
  getRandomWait(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
	* @name startGame
	* @summary Begin a Hot Potato Game
	* @return {undefined}
	*/
  startGame() {
    const gameDelay = 15000; // 15-seconds in milliseconds
    const gameLength = 30; // seconds
    let elapsedSeconds = 0;
    this.isStarter = true;

    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      let timerID = setInterval(() => {
        this.gameLog.push(`Game starting in: ${ (gameDelay / 1000) - elapsedSeconds} seconds`);

        if (elapsedSeconds === (gameDelay / 1000)) {
          this.gameLog.push('Sending hot potato...\n');

          let hotPotatoMessage = hydra.createUMFMessage({
            to: 'hpp:/',
            frm: 'hpp:/',
            typ: 'hotpotato',
            bdy: {
              command: 'hotpotato',
              expiration: Math.floor(Date.now() / 1000) + gameLength
            }
          });
          this.passHotPotato(hotPotatoMessage);
          clearInterval(timerID);
        }
        elapsedSeconds += 1;
      }, 1000);
    });
  }

  /**
	* @name gameOver
	* @summary Handle game over
	* @param {string} result - result of game
	* @return {undefined}
	*/
  gameOver(result) {
    this.gameLog.push(result);
    if (this.isStarter) {
      this.resolve();
    }
  }

  /**
	* @name passHotPotato
	* @summary Improved version of Passing hot potato to another player
	* @param {object} hotPotatoMessage - hot potato message
	* @return {undefined}
	*/
  passHotPotato(hotPotatoMessage) {
    let randomWait = this.getRandomWait(1000, 2000);
    let timerID = setTimeout(() => {
      hydra.getServicePresence('hpp-service').then((instances) => {
        let sent = false;
        for (let i = 0; i < instances.length; i++) {
          if (instances[i].instanceID !== hydra.getInstanceID()) {
            hotPotatoMessage.to = `${instances[i].instanceID}@hpp:/`;
            hotPotatoMessage.frm = `${hydra.getInstanceID()}@hpp:/`;
            hydra.sendMessage(hotPotatoMessage);
            clearInterval(timerID);
            sent = true;
            break;
          }
        }
        if (!sent) {
          this.gameLog.push('No other players found. Try adding players first and then starting the player with the hot potato last.');
          clearInterval(timerID);
        }
      });
    }, randomWait);
  }
}

module.exports = new HotPotatoPlayer();