const canvas = `<canvas id="screen" width="550" height="550"
style="border:1px solid #c3c3c3;">
</canvas>`;
const smallCanvas = `<canvas id="screen" width="250" height="250"
style="border:1px solid #c3c3c3;">
</canvas>`;
let loggedIn = [];
let game_state = [];
//takes Express app, returns constructed Express-router object with routes
function gen(app)
{
    //Routes definition
    app.post('/data',async (req,res,err) => {
	    console.log(req.body);
        res.send('{"data":"hi"}');
    });
    app.post('/game_state',async (req,res,err) => {
        
    });

}
exports.gen = gen;