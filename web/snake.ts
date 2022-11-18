import {SingleTouchListener, isTouchSupported, KeyboardHandler, TouchMoveEvent} from './io.js'
import {getHeight, getWidth, RGB, Sprite, GuiCheckList, GuiButton, SimpleGridLayoutManager, GuiLabel, GuiListItem} from './gui.js'
import {random, srand, max_32_bit_signed, DynamicInt32Array, saveBlob, FixedSizeQueue, Queue, PriorityQueue} from './utils.js'
import {menu_font_size, SquareAABBCollidable } from './game_utils.js'

class LayerManagerTool {
    list:GuiCheckList;
    layoutManager:SimpleGridLayoutManager;
    buttonAddLayer:GuiButton;
    runningId:number;
    static running_number:number = 0;
    layersLimit:number;
    callback_layer_count:() => number;
    callback_swap_layers:(l1:number, l2:number) => void;
    callback_slide_event:(layer:number, slider_value:number) => number;
    callback_add_layer:() => void;
    callback_delete_layer:(layer:number) => void;
    callback_checkbox_event:(layer:number, state:boolean) => void;
    callback_onclick_event:(layer:number) => void;

    constructor(limit:number = 16, callback_add_layer:() => void, 
    callback_checkbox_event:(layer:number, state:boolean) => void,
    callback_delete_layer:(layer:number) => void,
    callback_layer_count:() => number,
    callback_onclick_event:(layer:number) => void,
    callback_slide_event:(layer:number, slider_value:number) => number,
    callback_swap_layers:(l1:number, l2:number) => void)
    {
        this.callback_add_layer = callback_add_layer;
        this.callback_checkbox_event = callback_checkbox_event;
        this.callback_delete_layer = callback_delete_layer;
        this.callback_layer_count = callback_layer_count;
        this.callback_onclick_event = callback_onclick_event;
        this.callback_slide_event = callback_slide_event;
        this.callback_swap_layers = callback_swap_layers;
        this.layersLimit = isTouchSupported()?limit - Math.floor(limit / 4) : limit;
        this.layoutManager = new SimpleGridLayoutManager([2, 24], [200, 640]);
        this.list = new GuiCheckList([1, this.layersLimit], [200, 520], 20, false, this.callback_swap_layers,
        (event:SlideEvent) => {
            const index:number = this.list.list.findIndex(element => element.slider === event.element);
            this.callback_slide_event(index, event.value);
        });
        this.buttonAddLayer = new GuiButton(() => { this.pushList(`${++this.runningId}*x`); this.callback_onclick_event(0) }, "Add Layer", 99, 40, 16);
        this.layoutManager.addElement(new GuiLabel("Layers list:", 200));
        this.layoutManager.addElement(this.list);
        this.layoutManager.addElement(this.buttonAddLayer);
        this.layoutManager.addElement(new GuiButton(() => this.deleteItem(), "Delete", 99, 40, 16));
    
        this.runningId = ++LayerManagerTool.running_number;
        this.pushList(`${this.runningId}*x`);
        this.list.refresh();
    }
    deleteItem(index:number = this.list.selected()):void
    {
        if(this.list.list.length > 1 && this.list.list[index]){
            this.list.delete(index);
            this.callback_delete_layer(index);
        }
    }
    pushList(text:string): void {
        if(this.list.list.length < this.layersLimit)
        {
            if(this.callback_layer_count() < this.list.list.length)
            {
                this.callback_add_layer();
            }
            else if(this.callback_layer_count() === this.list.list.length)
            {
                //noop
            }
            if(this.callback_layer_count() !== this.list.list.length)
                console.log("Error field layers out of sync with layers tool");
            
            this.list.push(text, true, (e) => {
                    const index:number = this.list.findBasedOnCheckbox(e.checkBox);
                    this.callback_checkbox_event(index, e.checkBox.checked);
                },
                (e) => {
                    this.list.list.forEach(el => el.textBox.deactivate());
                    if(this.list.selectedItem() && this.list.selectedItem()!.checkBox.checked)
                        this.list.selectedItem()!.textBox.activate();
                    this.callback_onclick_event(this.list.selected());
                });
                this.list.refresh();
        }
    }
    activateOptionPanel():void { this.layoutManager.activate(); }
    deactivateOptionPanel():void { this.layoutManager.deactivate(); }
    getOptionPanel():SimpleGridLayoutManager | null {
        return this.layoutManager;
    }
    optionPanelSize():number[]
    {
        return [this.layoutManager.canvas.width, this.layoutManager.canvas.height];
    }
    drawOptionPanel(ctx:CanvasRenderingContext2D, x:number, y:number):void
    {
        const optionPanel:SimpleGridLayoutManager = this.getOptionPanel()!;
        optionPanel.x = x;
        optionPanel.y = y;
        optionPanel.draw(ctx, x, y);
    }
};
class Function {
    source:string;
    compiled:(x:number) => number;
    x_min:number;
    x_max:number;
    dx:number;
    table:number[];
    constructor(source:string)
    {
        this.source = source;
        try{
        this.compiled = eval(`(x) => ${source}`);
        }catch(e:any)
        {
            console.log(e);
        }
        this.table = [];
        this.x_max = 0;
        this.x_min = 0;
        this.dx = 0;
    }
    calc_for(x_min:number, x_max:number, dx:number):number[]
    {
        this.x_max = x_max;
        this.x_min = x_min;
        this.dx = dx;
        this.table.splice(0, this.table.length);
        for(let i = x_min; i <= x_max; i += dx)
        {
            this.table.push(this.compiled(i));
        }
        return this.table;
    }
};
class Game extends SquareAABBCollidable {
    axises:Sprite;
    screen_buf:Sprite[];
    background_color:RGB;
    guiManager:SimpleGridLayoutManager;
    layer_manager:LayerManagerTool;
    graph_start_x:number;
    cell_dim:number[];
    scale:number;
    y_translation:number;
    x_translation:number;
    constructor(x:number, y:number, width:number, height:number)
    {
        super(x, y, width, height);
        this.scale = 1/10;
        this.x_translation = 0;
        this.y_translation = 0;
        this.graph_start_x = 200;
        const whratio = width / (height > 0 ? height : width);
        const rough_dim = 750;
        this.background_color = new RGB(0, 0, 0, 0);
        this.cell_dim = [rough_dim, Math.floor(rough_dim * whratio)];
        this.init(width, height, rough_dim, Math.floor(rough_dim * whratio));
        this.guiManager = new SimpleGridLayoutManager([1,1], [this.graph_start_x, getHeight()], 0, 0);
        this.layer_manager = new LayerManagerTool(10, () => { this.add_layer(); }, 
            (layer:number, state:boolean) => console.log(state),
            (layer:number) => this.screen_buf.splice(layer, 1),
            () => this.screen_buf.length,
            (layer:number) => this.try_render_functions(),
            (layer:number, slider_value:number) => console.log('layer', layer,'slider val', slider_value),
            (l1:number, l2:number) => this.swap_layers(l1, l2)
            );
        this.axises = this.new_sprite();
        this.guiManager.addElement(this.layer_manager.layoutManager);
        this.guiManager.activate();
        //this.restart_game();
        this.try_render_functions();
    }
    add_layer():void
    {
        this.screen_buf.push(this.new_sprite());
    }
    swap_layers(l1:number, l2:number):void
    {

    }
    set_place(index:number, color:number):boolean
    {
        const view = new Int32Array(this.screen_buf.imageData!.data.buffer);
        if(view[index] !== undefined)
        {
            view[index] = color;
            return true;
        }
        return false;
    }
    get_place(index:number):number | null
    {
        const view = new Int32Array(this.screen_buf.imageData!.data.buffer);
        if(view[index] !== undefined)
        {
            return view[index];
        }
        return null;
    }
    is_background(index:number):boolean
    {
        const view = new Int32Array(this.screen_buf.imageData!.data.buffer);
        return this.get_place(index) == this.background_color.color;
    }
    clear_place(removed:number):boolean
    {
        const view = new Int32Array(this.screen_buf.imageData!.data.buffer);
        if(view[removed] !== undefined)
        {
            view[removed] = this.background_color.color;
            return true;
        }
        return false;
    }
    restart_game():void
    {
        this.init(this.width, this.height, this.cell_dim[0], this.cell_dim[1]);
    }
    init(width:number, height:number, cell_width:number, cell_height:number):void
    {
        this.resize(width, height);
        this.background_color = new RGB(0, 0, 0, 0);
        this.cell_dim = [cell_width, cell_height];
        const pixels = (new Array<RGB>(cell_height * cell_width)).fill(this.background_color, 0, cell_height * cell_width);
        const old_buf = this.screen_buf;
        this.screen_buf = [];
    }
    new_sprite():Sprite
    {   
        const pixels = (new Array<RGB>(this.cell_dim[1] * this.cell_dim[0])).fill(this.background_color, 0, this.cell_dim[1] * this.cell_dim[0]);
        return new Sprite(pixels, this.cell_dim[0], this.cell_dim[1], false);
    }
    
    resize(width:number, height:number):void
    {
        this.width = width;
        this.height = height;
    }
    draw_point(x:number, y:number, color:number, view:Int32Array = new Int32Array(this.screen_buf.imageData!.data.buffer)):void
    {
        const x_scale:number = 1/this.width * this.cell_dim[0];
        const y_scale:number = 1/this.height * this.cell_dim[1];
        const x1 = x * x_scale;
        const y1 = y * y_scale;
        view[Math.floor(x1) + Math.floor(y1) * this.cell_dim[0]] = color;
    }
    draw_line_segment(x1:number, x2:number, y1:number, y2:number, color:number, view:Int32Array = new Int32Array(this.screen_buf[0].imageData!.data.buffer)):void
    {
        //draw line from current touch pos to the touchpos minus the deltas
        //calc equation for line
        const deltaY = y2 - y1;
        const deltaX = x2 - x1;
        const m:number = deltaY/deltaX;
        const b:number = y2-m*x2;
        const delta:number = 1;
        if(Math.abs(deltaX) > Math.abs(deltaY))
        {
            const min:number = Math.min(x1, x2);
            const max:number = Math.max(x1, x2);
            for(let x = min; x < max; x+=delta)
            {
                let y:number = Math.abs(deltaX) > 0 ? m*(x) + b : y2;
                view[Math.floor(x) + Math.floor(y) * this.cell_dim[0]] = color;
            }
        }
        else
        {
            const min:number = Math.min(y1, y2);
            const max:number = Math.max(y1, y2);
            for(let y = min; y < max; y+=delta)
            {
                const x:number = Math.abs(deltaX)>0?(y - b)/m:x2;
                view[Math.floor(x) + Math.floor(y) * this.cell_dim[0]] = color;
            }
        } 
    }
    try_render_functions()
    {
        let functions:Function[] = [];
        //this.screen_buf = [];
        this.screen_buf.forEach(buf => buf.ctx.clearRect(0, 0, this.cell_dim[0], this.cell_dim[1]));
        this.layer_manager.list.list.forEach((li:GuiListItem, index:number) => {
            const text = li.textBox.text;
            if(!this.screen_buf[index])
            {
                this.screen_buf.push(this.new_sprite());
            }
            functions.push(new Function(text));
        });
        const x_min = this.x_translation * this.scale - 1/this.scale;
        const x_max = this.x_translation * this.scale + 1/this.scale;
        const deltaX = x_max - x_min;
        const y_min = this.y_translation * this.scale - deltaX / 2;
        const y_max = this.y_translation * this.scale + deltaX / 2;
        const deltaY = y_max - y_min;
        console.log(x_min, x_max, y_min, y_max)
        
        functions.forEach((foo:Function, index:number) => {
            const view = new Int32Array(this.screen_buf[index].imageData!.data.buffer);
            const color = new RGB(index * 30 % 256, index * 50 % 256, index * 20 % 256, 255);
            this.screen_buf[index].ctx.strokeStyle = color.htmlRBG();
            try{
                foo.calc_for(x_min, x_max, (x_max - x_min) / this.cell_dim[0]);
                let last_x = 0;
                let last_y = ((-foo.table[0] - y_min) / deltaY) * this.cell_dim[1];;
                this.screen_buf[index].ctx.beginPath();
                for(let i = 0; i < foo.table.length; i++)
                {
                    const x = x_min + foo.dx * i;
                    const y = -foo.table[i];
                    const sy = ((y - y_min) / deltaY) * this.cell_dim[1];
                    const sx = ((x - x_min) / deltaX) * this.cell_dim[0];
                    if(sx !== last_x || sy !== last_y)
                    {
                        this.screen_buf[index].ctx.moveTo(last_x, last_y)
                        this.screen_buf[index].ctx.lineTo(sx, sy);
                    }
                    last_x = sx;
                    last_y = sy;
                }
                this.screen_buf[index].ctx.stroke();
            }
            catch(e:any)
            {
                console.log(e);
            }
        });
    }
    draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void 
    {
        const font_size = 24;
        if(+ctx.font.split("px")[0] != font_size)
        {
            ctx.font = `${font_size}px Helvetica`;
        }

        const x_min = this.x_translation * this.scale - 1/this.scale;
        const x_max = this.x_translation * this.scale + 1/this.scale;
        const deltaX = x_max - x_min;
        const y_min = this.y_translation * this.scale - deltaX / 2;
        const y_max = this.y_translation * this.scale + deltaX / 2;
        const deltaY = y_max - y_min;
        const screen_space_x_axis = (0 - y_min) / deltaY * this.cell_dim[1];
        const screen_space_y_axis = (0 - x_min) / deltaX * this.cell_dim[0];
        this.axises.ctx.clearRect(0, 0, this.cell_dim[0], this.cell_dim[1]);
        this.axises.ctx.beginPath();
        if(x_min <= 0 && x_max >= 0)
        {
            this.axises.ctx.moveTo(0, screen_space_x_axis);
            this.axises.ctx.lineTo(this.width, screen_space_x_axis);
        }
        if(y_min <= 0 && y_max >= 0)
        {
            this.axises.ctx.moveTo(screen_space_y_axis, 0);
            this.axises.ctx.lineTo(screen_space_y_axis, this.height);
        }
        this.axises.ctx.stroke();
        ctx.drawImage(this.axises.image, x, y, width, height);
        this.screen_buf.forEach(buf => {
                //buf.refreshImage();
                ctx.drawImage(buf.image, x, y, width, height);
            });
        
        this.guiManager.draw(ctx);
    }
    cell_dist(cell1:number, cell2:number):number
    {
        const c1x = cell1 % this.cell_dim[0];
        const c1y = Math.floor(cell1 / this.cell_dim[0]);
        const c2x = cell2 % this.cell_dim[0];
        const c2y = Math.floor(cell2 / this.cell_dim[0]);
        //return (Math.abs(c1x - c2x) + Math.abs(c1y - c2y));
        return Math.sqrt(Math.pow(c1x - c2x, 2) + Math.pow(c1y - c2y, 2));
    }
    column(cell):number
    {
        return cell % this.cell_dim[0];
    }
    row(cell):number
    {
        return Math.floor(cell / this.cell_dim[0]);
    }
    screen_to_index(x:number, y:number):number
    {
        const x_scale = 1 / this.width * this.cell_dim[0];
        const y_scale = 1 / this.height * this.cell_dim[1];
        x *= x_scale;
        y *= y_scale;
        return Math.floor(x) + Math.floor(y) * this.cell_dim[0];
    }
    fill(start:number, color_p:number):void
    {
        //const view:Int32Array = new Int32Array(this.screen_buf.imageData!.data.buffer);
        //const start_color = view[start];
        console.log("trying to fill")
        this.traverse_df(start, 
            (index, color) => color_p, 
                (index, color) => color == this.background_color.color);
    }
    traverse_df(start:number, apply:(index:number, color:number) => number, verifier:(index:number, color:number) => boolean):void
    {
        const view:Int32Array = new Int32Array(this.screen_buf.imageData!.data.buffer);
        const checked_map:Int32Array = new Int32Array(view.length);
        checked_map.fill(0, 0, checked_map.length);
        const stack:number[] = [];
        stack.push(start);
        while(stack.length > 0)
        {
            const current = stack.pop()!;
            if(!checked_map[current] && verifier(current, view[current]))
            {
                checked_map[current] = 1;
                view[current] = apply(current, view[current]);
                
                if(checked_map[current + 1] === 0  && this.row(current + 1) === this.row(current) && view[current + 1] !== undefined)
                {
                    stack.push(current + 1);
                }
                if(checked_map[current - 1] === 0  && this.row(current - 1) === this.row(current) && view[current - 1] !== undefined)
                {
                    stack.push(current - 1);
                }
                if(checked_map[current + this.cell_dim[0]] === 0 && this.column(current + this.cell_dim[0]) === this.column(current) && view[current + this.cell_dim[0]] !== undefined)
                {
                    stack.push(current + this.cell_dim[0]);
                }
                if(checked_map[current - this.cell_dim[0]] === 0 && this.column(current - this.cell_dim[0]) === this.column(current) && view[current - this.cell_dim[0]] !== undefined)
                {
                    stack.push(current - this.cell_dim[0]);
                }
            }
        }
    }
    update_state(delta_time: number): void 
    {

    }
};
const keyboardHandler = new KeyboardHandler();
async function main()
{
    const canvas:HTMLCanvasElement = <HTMLCanvasElement> document.getElementById("screen");
    const touchListener = new SingleTouchListener(canvas, true, true, false);


    canvas.onmousemove = (event:MouseEvent) => {
    };
    canvas.addEventListener("wheel", (e) => {
        //e.preventDefault();
    });
    canvas.width = getWidth();
    canvas.height = getHeight();
    canvas.style.cursor = "pointer";
    let counter = 0;
    const touchScreen:boolean = isTouchSupported();
    let height = getHeight();
    let width = getWidth();
    let game = new Game(0, 0, height, width);
    window.game = game;
    let low_fps:boolean = true;
    let draw = false;
    game.guiManager.createHandlers(keyboardHandler, touchListener);
    /*touchListener.registerCallBack("touchstart", (event:any) => true, (event:TouchMoveEvent) => {
       game.guiManager.handleTouchEvents("touchstart", event);
    });
    touchListener.registerCallBack("touchend", (event:any) => true, (event:TouchMoveEvent) => {
       game.guiManager.handleTouchEvents("touchend", event);
    });*/
    touchListener.registerCallBack("touchmove", (event:any) => true, (event:TouchMoveEvent) => {
        //game.guiManager.handleTouchEvents("touchmove", event);
        game.y_translation -= (event.deltaY / game.height * game.cell_dim[1]) / 2;
        game.x_translation -= (event.deltaX / game.width * game.cell_dim[0]) / 2;
        game.try_render_functions();
    });
    keyboardHandler.registerCallBack("keydown", () => true, (event:any) => {
        if(!keyboardHandler.keysHeld["MetaLeft"] && !keyboardHandler.keysHeld["ControlLeft"] &&
            !keyboardHandler.keysHeld["MetaRight"] && !keyboardHandler.keysHeld["ControlRight"])
            event.preventDefault();
        game.try_render_functions();
        switch(event.code)
        {
            case("ArrowUp"):
            break;
            case("ArrowDown"):
            break;
            case("ArrowLeft"):
            break;
            case("ArrowRight"):
            break;
        }
    });
    let maybectx:CanvasRenderingContext2D | null = canvas.getContext("2d");
    if(!maybectx)
        return;
    const ctx:CanvasRenderingContext2D = maybectx;
    let start = Date.now();
    let dt = 1;
    const ostart = Date.now();
    let frame_count = 0;
    let instantaneous_fps = 0;
    const time_queue:FixedSizeQueue<number> = new FixedSizeQueue<number>(60 * 2);
    const header = document.getElementById("header");
    srand(Math.random() * max_32_bit_signed);


    const drawLoop = () => 
    {
        frame_count++;
        //do stuff and render here
        if(getWidth() !== width || getHeight() !== height)
        {
            width = getWidth();
            height = getHeight();
            game.resize(width, height - 100);
            canvas.width = width;
            canvas.height = height;
        }
        dt = Date.now() - start;
        time_queue.push(dt);
        start = Date.now();
        let sum = 0;
        let highest = 0;
        for(let i = 0; i < time_queue.length; i++)
        {
            const value = time_queue.get(i);
            sum += value;
            if(highest < value)
            {
                highest = value;
            }
        }
        game.update_state(dt);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        game.draw(canvas, ctx, game.x, game.y, game.width, game.height);
        if(frame_count % 10 === 0)
            instantaneous_fps = Math.floor(1000 / (low_fps?highest:dt));
        let text = "";
        ctx.fillStyle = "#FFFFFF";
        text = `avg fps: ${Math.floor(1000 * time_queue.length / sum)}, ${low_fps?"low":"ins"} fps: ${instantaneous_fps}`;
        const text_width = ctx.measureText(text).width;
        ctx.strokeText(text, game.width - text_width - 10, menu_font_size());
        ctx.fillText(text, game.width - text_width - 10, menu_font_size());

        requestAnimationFrame(drawLoop);
    }
    drawLoop();
    game.resize(width, height - header!.clientHeight - 100);

}
main();





