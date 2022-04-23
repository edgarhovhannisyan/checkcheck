// NOTE: this example uses the chess.js chessboard.js libraries:
// https://github.com/jhlywa/chess.js

var board = null
var game = new Chess()
const alreadyFoundMoves = []
var total_score = 0
var game_regime = 0
var current_score = 0
var roundNumber = 0
var num_correct_moves = 0
var currentCorrectMoves = []
var $current_score = $("#current_score")
const audio_error = new Audio('sound/audio_wrong_move.wav')
const audio_correct = new Audio('sound/audio_correct_move.wav')
const audio_next_round = new Audio('sound/audio_next_round.wav')
var menu_container = document.getElementById("menu_container_id");
var game_container = document.getElementById("game_container_id");
var score_ref = document.getElementById("total_score_id");
var round_ref = document.getElementById("current_round_id");

// Get reference to the menu options and assign onClick listeners

document.getElementById('checks_button').onclick = function () { startGame(1) }
document.getElementById('captures_button').onclick = function () { startGame(2) }
//document.getElementById('up_button').onclick = function () { startGame(3) }

function reset_game() {
    board = null
    game = new Chess()
    alreadyFoundMoves = []
    total_score = 0
    current_score = 0
    roundNumber = 0
    num_correct_moves = 0
    game_regime = 1
    correctMoves = []
}

//startNextRound(current_game_regime)
function startGame(current_game_regime) {
    game_regime = current_game_regime
    startNextRound(game_regime)
    console.log("The game has started in regime " + game_regime)
}

function startNextRound(regime) {
    menu_container.style.display = "none";
    game_container.style.display = "block";

    // reset round stats
    roundNumber += 1
    round_ref.innerHTML = roundNumber
    alreadyFoundMoves.length = 0;
    current_score = 0
    // get a random position
    var pickedFen = pickRandomFEN(db_fen_js)


    // check how many correct moves there are in the position. If none, pick another FEN from db
    while (returnListOfCorrectMoves(pickedFen, regime).length < 1) {
        pickedFen = pickRandomFEN(db_fen_js)
    }
    num_correct_moves = returnListOfCorrectMoves(pickedFen, regime).length

    //Start the game with picked FEN position and set the board
    game.load(pickedFen)

    var orient = 'white'
    if (game.turn() == 'b') {
        orient = 'black'
    }
    var config = {
        draggable: true,
        orientation: orient,
        position: pickedFen,
        showNotation: true,
        promotion: '',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd
    }
    board = Chessboard('board', config)
    // jQuery('#board').on('scroll touchmove touchend touchstart contextmenu', function (e) {
    //     e.preventDefault();
    // });

}

function pickRandomFEN(db_fen) {
    var obj_keys = Object.keys(db_fen);
    var ran_fen_num = Math.floor(Math.random() * obj_keys.length);
    //To do: Make sure random key is different from the previous keys
    return db_fen[ran_fen_num].fen;
}

function returnListOfCorrectMoves(fen, regime) {
    var correctMoves = []
    var tempGame = new Chess(fen)
    var possibleMoves = tempGame.moves({ verbose: true })



    switch (regime) {


        case 1:
            // If the "Find all chekcs option is selected" go over all moves and store the ones which result in a checked position
            console.log("we are in regime 1")
            var i;
            for (i = 0; i < possibleMoves.length; i++) {
                tempGame.move(possibleMoves[i])
                if (tempGame.in_check()) {
                    correctMoves.push(possibleMoves[i])
                }
                tempGame.undo()
            }
            currentCorrectMoves = correctMoves
            return correctMoves
        case 2:
            console.log("we are in regime 2")

            var i;
            for (i = 0; i < possibleMoves.length; i++) {
                if ('captured' in possibleMoves[i]) {
                    correctMoves.push(possibleMoves[i])
                    console.log("Let's check if captured key is in possibleMoves[i]")
                    console.log('This is possibleMoves[i]')
                    console.log(possibleMoves[i])
                    console.log('This is if captured in possibleMoves[i]')
                    console.log('This is ' + ('captured' in possibleMoves[i]))
                } else {
                    console.log('This move is not a capture')
                    console.log(possibleMoves[i])
                }
            }
            currentCorrectMoves = correctMoves
            return correctMoves
        case 3:
            console.log("Game has started in regime 3 which is not implemented yet");
            break;
        default:
            console.log("Somehow we are in a default switch state!!!");
    }

}

function onDragStart(source, piece, position, orientation) {
    // do not pick up pieces if the game is over
    if (game.game_over()) return false

    // only pick up pieces for the side to move
    if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false
    }
}

function containsObject(obj, list) {
    // check if the newly found move has already been made previously
    var i;
    for (i = 0; i < list.length; i++) {
        if (list[i].from === obj.from && list[i].to === obj.to) {
            return true;
        }
    }

    return false;
}

function onDrop(source, target) {
    // see if the move is legal
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
    })

    // illegal move
    if (move === null) return 'snapback'

    // if in check, revert to previous position
    //if (game.in_check()) {
    if (containsObject(move, currentCorrectMoves)) {

        var fromToObject = { from: move.from, to: move.to }
        if (containsObject(fromToObject, alreadyFoundMoves)) {
            cloneAndPlay(audio_error)
            console.log("This move has already been found previously!")
            //audio_error.play()
        } else {
            alreadyFoundMoves.push(fromToObject)
            current_score += 1
            total_score += 1
            score_ref.innerHTML = total_score

            // check if the round is finished
            if (current_score == num_correct_moves) {
                cloneAndPlay(audio_next_round)
                //audio_next_round.play()
                return startNextRound(game_regime)
            } else {
                cloneAndPlay(audio_correct)
                //audio_correct.play()
            }
        }
        $current_score.html(current_score)
    } else {
        //updateStatus()
        cloneAndPlay(audio_error)
        //audio_error.play()
    }
    game.undo()
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd() {
    board.position(game.fen())
}

// function that will clone the audio node, and play it
function cloneAndPlay(audioNode) {
    // the true parameter will tell the function to make a deep clone (cloning attributes as well)
    var clone = audioNode.cloneNode(true);
    clone.play();
}

//Jquery set $current_score.html(total_score)
