var tile = {width: 50, height: 50};
function draw(block){
	
	ctx.fillStyle = block.color;
	ctx.rect(block.x+1, block.y+1, tile.width,tile.height);
	ctx.fill();

	ctx.rect(block.x, block.y, tile.width,tile.height);
	
	ctx.stroke();
}

var block = {color: "red", x: 300, y: 200};
var canvas = document.getElementById('game_canvas');
var ctx = canvas.getContext('2d');
ctx.strokeStyle = "black";
ctx.lineWidth = 1;
draw(block);