// NOTE: this example uses the chess.js chessboard.js libraries:
// https://github.com/jhlywa/chess.js

var board = null
var game = new Chess()
const alreadyFoundMoves = []
const alreadyFoundSquares = []
var total_score = 0
var game_regime = 0
var current_score = 0
var roundNumber = 0
var num_correct_moves = 0
var num_correct_squares = 0
var currentCorrectMoves = []
var currentCorrectSquares = []
var $current_score = $("#current_score")
var $board = null
const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const audio_error = new Audio('sound/audio_wrong_move.wav')
const audio_correct = new Audio('sound/audio_correct_move.wav')
const audio_next_round = new Audio('sound/audio_next_round.wav')
var menu_container = document.getElementById("menu_container_id");
var game_container = document.getElementById("game_container_id");
var score_ref = document.getElementById("total_score_id");
var round_ref = document.getElementById("current_round_id");
var title_ref = document.getElementById("board_title_id");
var turn_ref = document.getElementById("turn_to_move");
var squareClass = 'square-55d63'
var squareToHighlight = null
var colorToHighlight = null

// Get reference to the menu option buttons and set onClick callbacks

document.getElementById('checks_button').onclick = function () { startGame(1) }
document.getElementById('captures_button').onclick = function () { startGame(2) }
document.getElementById('up_button').onclick = function () { startGame(3) }

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

function setTitle(current_game_regime) {
    switch (current_game_regime) {
        case 1: title_ref.innerHTML = "Find all checking moves in the position"
            break
        case 2: title_ref.innerHTML = "Find all capturing moves in the position"
            break
        case 3: title_ref.innerHTML = "Find all undefended squares in the position"
            break
        default: title_ref.innerHTML = "Find all correct moves/squares in the position"
    }
}

function setTurnText(chess_game) {
    turn_ref.innerHTML = "White to move"
    if (chess_game.turn() == 'b') {
        turn_ref.innerHTML = "Black to move"
    }
}

function startGame(current_game_regime) {
    menu_container.style.display = "none";
    game_container.style.display = "block";

    game_regime = current_game_regime
    console.log("startGame() worked and the startNextRound() is called")
    startNextRound(game_regime)
}

function startNextRound(regime) {
    setTitle(regime)
    // reset round stats
    roundNumber += 1
    round_ref.innerHTML = roundNumber
    alreadyFoundMoves.length = 0;
    alreadyFoundSquares.length = 0;
    current_score = 0
    // get a random position
    var pickedFen = pickRandomFEN(db_fen_js)

    // check how many correct moves or squares there are in the position. If none, pick another FEN from db
    if (regime == 3) {
        currentCorrectSquares = getListOfCorrectSquares(pickedFen)
        while (currentCorrectSquares.length < 1) {
            console.log('Trying another position, as this one had no undefended squares')
            pickedFen = pickRandomFEN(db_fen_js)
            currentCorrectSquares = getListOfCorrectSquares(pickedFen)
        }
        num_correct_squares = currentCorrectSquares.length
        console.log('This is the final list of correct squares')
        console.log(currentCorrectSquares)
    } else {
        while (getListOfCorrectMoves(pickedFen, regime).length < 1) {
            console.log('Trying another position, as this one had no checking/capturing moves')
            pickedFen = pickRandomFEN(db_fen_js)
        }
        num_correct_moves = getListOfCorrectMoves(pickedFen, regime).length
    }

    console.log('Starting the game and setting up the board')
    //Start the game with picked FEN position and set the board
    game.load(pickedFen)

    var orient = 'white'
    //Todo: add label white to move
    if (game.turn() == 'b') {
        orient = 'black'
        //Todo: add label black to move
    }
    var config = {
        draggable: true,
        orientation: orient,
        position: pickedFen,
        showNotation: true,
        promotion: 'q',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd
    }
    board = Chessboard('board', config)

    // Show who's turn it is
    setTurnText(game)
    // Prevent scrolling the whole page
    jQuery('#board').on('scroll touchmove touchend touchstart contextmenu', function (e) {
        e.preventDefault();
    });

}

function pickRandomFEN(db_fen) {

    var obj_keys = Object.keys(db_fen);
    var ran_fen_num = Math.floor(Math.random() * obj_keys.length);
    //To do: Make sure random key is different from the previous keys
    return db_fen[ran_fen_num].fen;
}

function onDragStart(source, piece, position, orientation) {

    // check if the game is in regime 3 and implement logic
    if (game_regime == 3) {

        if (isUndefended(source, currentCorrectSquares)) {

            if (alreadyFoundSquares.includes(source)) {
                //ToDo: change the sound to already found this square/move sound
                cloneAndPlay(audio_error)
            } else {
                alreadyFoundSquares.push(source)
                updateScore()
                // check if the round is finished
                if (current_score == num_correct_squares) {
                    cloneAndPlay(audio_next_round)
                    startNextRound(game_regime)
                    return false
                } else {
                    highlightSquare(source)
                    cloneAndPlay(audio_correct)
                }
            }
            $current_score.html(current_score)
        } else {
            cloneAndPlay(audio_error)
        }
        return false
        // If not in regime 3 allow piece for only the side to move and if the game is not over
    } else {
        // do not pick up pieces if the game is over
        if (game.game_over()) return false

        // only pick up pieces for the side to move
        if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
            return false
        }
    }
}

function findKingNearby(square, game) {
    //check if there is a king of same color neighboring the selected square
    let letters_nearby = []
    let numbers_nearby = []
    let square_letter = square.charAt(0);
    let square_number = parseInt(square.charAt(1))
    let square_letter_index = letters.indexOf(square_letter)
    if (square_letter_index == 0) {
        letters_nearby = ['a', 'b']
    } else if (square_letter_index == 7) {
        letters_nearby = ['g', 'h']
    } else {
        letters_nearby = [letters[square_letter_index - 1], square_letter, letters[square_letter_index + 1]]
    }
    if (square_number == 1) {
        numbers_nearby = [1, 2]
    } else if (square_number == 8) {
        numbers_nearby = [7, 8]
    } else {
        numbers_nearby = [square_number - 1, square_number, square_number + 1]
    }

    let i
    let j
    let temp_square = null
    for (i = 0; i < letters_nearby.length; i++) {
        for (j = 0; j < numbers_nearby.length; j++) {
            temp_square = letters_nearby[i] + numbers_nearby[j]
            // check if there is a piece on this nearby square
            if (game.get(temp_square) == null) {
                continue
            }
            // check if the piece is a king of corresponding color
            if (game.get(temp_square).type.includes('k') && (game.turn() == game.get(temp_square).color)) {
                return true
            }
        }
    }
    return false
}

function getListOfCorrectSquares(fen) {
    // Get all the squares that have undefended pieces 
    // ToDo: Decide if only for 1 side or both. Currently 1 sides
    var correctSquares = []
    var tempGame = new Chess(fen)
    if (tempGame.in_check()) {
        //return empty list which will force to pick new random FEN position
        let emptyList = []
        return emptyList
    }
    var allPieceSquares = getAllPieceSquares(tempGame)
    console.log(allPieceSquares)
    var ind
    for (ind = 0; ind < allPieceSquares.length; ind++) {
        var selected_square = allPieceSquares[ind]
        var pieceOnSelectedSquare = tempGame.get(selected_square)
        pieceOnSelectedSquareString = pieceOnSelectedSquare.type + pieceOnSelectedSquare.color
        // Check if the current piece is of another color than the turn
        if (pieceOnSelectedSquare.color != tempGame.turn()) {
            continue
        }
        //Check if the current piece is a king
        if (pieceOnSelectedSquareString.includes("k") || pieceOnSelectedSquareString.includes("K")) {
            continue
        }

        new_piece = swapPieceColor(pieceOnSelectedSquare)
        tempGame.put(new_piece, selected_square)
        //Todo: check if the position is a valid fen. For example there can be mutual check after swap
        var possibleMovesTemp = tempGame.moves({ verbose: true })

        let possibleMovesTempTo = [];
        var i
        for (i = 0; i < possibleMovesTemp.length; i++) {
            possibleMovesTempTo[i] = possibleMovesTemp[i]["to"];
        }
        //Todo: check if the returned object exists

        if (possibleMovesTempTo.includes(selected_square) || findKingNearby(selected_square, tempGame) == true) {
        } else {
            correctSquares.push(selected_square)
        }
        //reverting back the swaped piece to check the next one
        pieceOnSelectedSquare = tempGame.get(selected_square)
        new_piece = swapPieceColor(pieceOnSelectedSquare)
        tempGame.put(new_piece, selected_square)
    }
    currentCorrectSquares = correctSquares
    return correctSquares
}

function getAllPieceSquares(tempGame) {

    var allPieceSquares = []
    var i
    var j
    for (i = 0; i < 8; i++) {
        for (j = 0; j < 8; j++) {
            squareToCheck = letters[j] + String(i + 1)

            if (tempGame.get(squareToCheck) == null) {
                continue
            } else {
                allPieceSquares.push(squareToCheck)
            }
        }
    }

    return allPieceSquares
}

function isUndefended(square, listOfCorrectSquares) {
    console.log(square)
    console.log(listOfCorrectSquares)
    if (listOfCorrectSquares.includes(square)) {
        return true
    } else {
        return false
    }
}

function getListOfCorrectMoves(fen, regime) {

    // If in regime 1 or 2, get list of all correct moves for the side to move
    var correctMoves = []
    var tempGame = new Chess(fen)
    var possibleMoves = tempGame.moves({ verbose: true })

    switch (regime) {

        case 1:
            // If the "Find all chekcs" option is selected go over all moves and store the ones which result in a checked position
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
            // If the "Find all captures" option is selected go over all moves and store the ones which are capture moves
            console.log("we are in regime 2")

            var i;
            for (i = 0; i < possibleMoves.length; i++) {
                if ('captured' in possibleMoves[i]) {
                    correctMoves.push(possibleMoves[i])
                } else {
                    console.log('This move is not a capture')
                    console.log(possibleMoves[i])
                }
            }
            currentCorrectMoves = correctMoves
            return correctMoves
        case 3:
            //This case is handled with another function and should not be triggered
            console.log("Game has started in regime 3 but this should not have been triggered");
        default:
            console.log("Somehow we are in the default switch state!!!");
    }
}

function highlightSquare(squareToHighlight) {
    // Highlight a given square with green? color
    $board = $("#board")
    $board.find('.square-' + squareToHighlight)
        .addClass('highlight')
}

function swapPieceColor(piece) {
    // helper function to swap a piece with opposite color piece
    var new_piece = piece
    if (piece.color == 'b') {
        new_piece.color = "w";
    } else {
        new_piece.color = "b";
    }
    return new_piece
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

function updateScore() {
    current_score += 1
    total_score += 1
    score_ref.innerHTML = total_score
}

function onDrop(source, target) {
    // see if the move is legal
    var move = game.move({
        from: source,
        to: target,
        promotion: 'qr' // TODO: always promote to a queen for example simplicity
    })

    // illegal move
    if (move === null) return 'snapback'

    // if in check, revert to previous position

    if (containsObject(move, currentCorrectMoves)) {

        var fromToObject = { from: move.from, to: move.to }
        if (containsObject(fromToObject, alreadyFoundMoves)) {
            cloneAndPlay(audio_error)
            console.log("This move has already been found previously!")
        } else {
            alreadyFoundMoves.push(fromToObject)
            updateScore()
            // check if the round is finished
            if (current_score == num_correct_moves) {
                cloneAndPlay(audio_next_round)
                return startNextRound(game_regime)
            } else {
                cloneAndPlay(audio_correct)
            }
        }
        $current_score.html(current_score)
    } else {
        cloneAndPlay(audio_error)
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