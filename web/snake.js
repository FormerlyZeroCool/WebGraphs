import { SingleTouchListener, isTouchSupported, KeyboardHandler } from './io.js';
import { getHeight, getWidth, RGB, Sprite, GuiCheckList, GuiButton, SimpleGridLayoutManager, GuiLabel } from './gui.js';
import { srand, max_32_bit_signed, FixedSizeQueue } from './utils.js';
import { menu_font_size, SquareAABBCollidable } from './game_utils.js';
class LayerManagerTool {
    constructor(limit = 16, callback_add_layer, callback_checkbox_event, callback_delete_layer, callback_layer_count, callback_onclick_event, callback_slide_event, callback_swap_layers, callback_get_error_parallel_array) {
        this.callback_add_layer = callback_add_layer;
        this.callback_checkbox_event = callback_checkbox_event;
        this.callback_delete_layer = callback_delete_layer;
        this.callback_layer_count = callback_layer_count;
        this.callback_onclick_event = callback_onclick_event;
        this.callback_slide_event = callback_slide_event;
        this.callback_swap_layers = callback_swap_layers;
        this.callback_get_error_parallel_array = callback_get_error_parallel_array;
        this.layersLimit = isTouchSupported() ? limit - Math.floor(limit / 4) : limit;
        this.layoutManager = new SimpleGridLayoutManager([100, 24], [200, getHeight()]);
        this.list = new GuiCheckList([1, this.layersLimit], [this.layoutManager.width(), getHeight() - 200], 20, false, this.callback_swap_layers, (event) => {
            const index = this.list.list.findIndex(element => element.slider === event.element);
            this.callback_slide_event(index, event.value);
        }, callback_get_error_parallel_array);
        this.buttonAddLayer = new GuiButton(() => { this.pushList(`x*x*${++this.runningId}`); this.callback_onclick_event(0); }, "Add Layer", this.layoutManager.width() / 2, 40, 16);
        this.layoutManager.addElement(new GuiLabel("Layers list:", this.layoutManager.width()));
        this.layoutManager.addElement(this.list);
        this.layoutManager.addElement(this.buttonAddLayer);
        this.layoutManager.addElement(new GuiButton(() => this.deleteItem(), "Delete", this.layoutManager.width() / 2, 40, 16));
        this.runningId = ++LayerManagerTool.running_number;
        this.pushList(`x*x*${this.runningId}`);
        this.list.refresh();
    }
    deleteItem(index = this.list.selected()) {
        if (this.list.list.length > 1 && this.list.list[index]) {
            this.list.delete(index);
            this.callback_delete_layer(index);
        }
    }
    pushList(text) {
        if (this.list.list.length < this.layersLimit) {
            if (this.callback_layer_count() < this.list.list.length) {
                this.callback_add_layer();
            }
            if (this.callback_layer_count() !== this.list.list.length)
                console.log("Error field layers out of sync with layers tool");
            this.list.push(text, true, (e) => {
                const index = this.list.findBasedOnCheckbox(e.checkBox);
                this.callback_checkbox_event(index, e.checkBox.checked);
            }, (e) => {
                this.list.list.forEach(el => el.textBox.deactivate());
                if (this.list.selectedItem() && this.list.selectedItem().checkBox.checked)
                    this.list.selectedItem().textBox.activate();
                this.callback_onclick_event(this.list.selected());
            });
            this.list.refresh();
        }
    }
    activateOptionPanel() { this.layoutManager.activate(); }
    deactivateOptionPanel() { this.layoutManager.deactivate(); }
    getOptionPanel() {
        return this.layoutManager;
    }
    optionPanelSize() {
        return [this.layoutManager.canvas.width, this.layoutManager.canvas.height];
    }
    drawOptionPanel(ctx, x, y) {
        const optionPanel = this.getOptionPanel();
        optionPanel.x = x;
        optionPanel.y = y;
        optionPanel.draw(ctx, x, y);
    }
}
LayerManagerTool.running_number = 0;
;
class Function {
    constructor(source) {
        this.source = source;
        this.error_message = null;
        try {
            this.compiled = eval(`(x) => ${source}`);
        }
        catch (e) {
            console.log(e.message);
            this.error_message = e.message;
        }
        this.table = [];
        this.x_max = 0;
        this.x_min = 0;
        this.dx = 0;
        this.color = new RGB(0, 0, 0, 0);
    }
    compile(source) {
        if (this.source !== source) {
            this.source = source;
            this.error_message = null;
            try {
                this.compiled = eval(`(x) => ${source}`);
            }
            catch (e) {
                console.log(e.message);
                this.error_message = e.message;
            }
            this.x_max = 0;
            this.x_min = 0;
            this.dx = 0;
        }
    }
    calc_for(x_min, x_max, dx) {
        if (this.error_message === null) {
            this.x_max = x_max;
            this.x_min = x_min;
            this.dx = dx;
            this.table.splice(0, this.table.length);
            try {
                for (let i = x_min; i <= x_max; i += dx) {
                    this.table.push(this.compiled(i));
                }
            }
            catch (error) {
                console.log(error.message);
                this.error_message = error.message;
            }
        }
        return this.table;
    }
}
;
class Game extends SquareAABBCollidable {
    constructor(x, y, width, height) {
        super(x, y, width, height);
        this.functions = [];
        this.draw_axises = true;
        this.x_min = this.x_translation * this.scale - 1 / this.scale;
        this.x_max = this.x_translation * this.scale + 1 / this.scale;
        this.deltaX = this.x_max - this.x_min;
        this.y_min = this.y_translation * this.scale - this.deltaX / 2;
        this.y_max = this.y_translation * this.scale + this.deltaX / 2;
        this.deltaY = this.y_max - this.y_min;
        this.scale = 1 / 10;
        this.x_translation = 0;
        this.y_translation = 0;
        this.graph_start_x = 200;
        const whratio = width / (height > 0 ? height : width);
        const rough_dim = getWidth();
        this.background_color = new RGB(0, 0, 0, 0);
        this.cell_dim = [rough_dim, Math.floor(rough_dim * whratio)];
        this.init(width, height, rough_dim, Math.floor(rough_dim * whratio));
        this.guiManager = new SimpleGridLayoutManager([1, 1], [this.graph_start_x, getHeight()], 0, 0);
        this.layer_manager = new LayerManagerTool(10, () => { this.add_layer(); }, (layer, state) => console.log(state), (layer) => { this.screen_buf.splice(layer, 1); this.functions.splice(layer, 1); }, () => this.screen_buf.length, (layer) => this.try_render_functions(), (layer, slider_value) => console.log('layer', layer, 'slider val', slider_value), (l1, l2) => this.swap_layers(l1, l2), (layer) => this.functions[layer] ? this.functions[layer].error_message : null);
        this.axises = this.new_sprite();
        this.guiManager.addElement(this.layer_manager.layoutManager);
        this.guiManager.activate();
        //this.restart_game();
        this.try_render_functions();
    }
    calc_bounds() {
        this.x_min = this.x_translation * this.scale - 1 / this.scale;
        this.x_max = this.x_translation * this.scale + 1 / this.scale;
        this.deltaX = this.x_max - this.x_min;
        this.y_min = this.y_translation * this.scale - this.deltaX / 2;
        this.y_max = this.y_translation * this.scale + this.deltaX / 2;
        this.deltaY = this.y_max - this.y_min;
    }
    add_layer() {
        this.screen_buf.push(this.new_sprite());
        this.functions.push(new Function(""));
    }
    swap_layers(l1, l2) {
        const temp = this.functions.splice(l1, 1)[0];
        this.functions.splice(l2, 0, temp);
    }
    set_place(index, color) {
        const view = new Int32Array(this.screen_buf.imageData.data.buffer);
        if (view[index] !== undefined) {
            view[index] = color;
            return true;
        }
        return false;
    }
    get_place(index) {
        const view = new Int32Array(this.screen_buf.imageData.data.buffer);
        if (view[index] !== undefined) {
            return view[index];
        }
        return null;
    }
    is_background(index) {
        const view = new Int32Array(this.screen_buf.imageData.data.buffer);
        return this.get_place(index) == this.background_color.color;
    }
    clear_place(removed) {
        const view = new Int32Array(this.screen_buf.imageData.data.buffer);
        if (view[removed] !== undefined) {
            view[removed] = this.background_color.color;
            return true;
        }
        return false;
    }
    restart_game() {
        this.init(this.width, this.height, this.cell_dim[0], this.cell_dim[1]);
    }
    init(width, height, cell_width, cell_height) {
        this.resize(width, height);
        this.background_color = new RGB(0, 0, 0, 0);
        this.cell_dim = [cell_width, cell_height];
        const pixels = (new Array(cell_height * cell_width)).fill(this.background_color, 0, cell_height * cell_width);
        const old_buf = this.screen_buf;
        this.screen_buf = [];
    }
    new_sprite() {
        const pixels = (new Array(this.cell_dim[1] * this.cell_dim[0])).fill(this.background_color, 0, this.cell_dim[1] * this.cell_dim[0]);
        return new Sprite(pixels, this.cell_dim[0], this.cell_dim[1], false);
    }
    resize(width, height) {
        this.width = width;
        this.height = height;
    }
    draw_point(x, y, color, view = new Int32Array(this.screen_buf.imageData.data.buffer)) {
        const x_scale = 1 / this.width * this.cell_dim[0];
        const y_scale = 1 / this.height * this.cell_dim[1];
        const x1 = x * x_scale;
        const y1 = y * y_scale;
        view[Math.floor(x1) + Math.floor(y1) * this.cell_dim[0]] = color;
    }
    draw_line_segment(x1, x2, y1, y2, color, view = new Int32Array(this.screen_buf[0].imageData.data.buffer)) {
        //draw line from current touch pos to the touchpos minus the deltas
        //calc equation for line
        const deltaY = y2 - y1;
        const deltaX = x2 - x1;
        const m = deltaY / deltaX;
        const b = y2 - m * x2;
        const delta = 1;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            const min = Math.min(x1, x2);
            const max = Math.max(x1, x2);
            for (let x = min; x < max; x += delta) {
                let y = Math.abs(deltaX) > 0 ? m * (x) + b : y2;
                view[Math.floor(x) + Math.floor(y) * this.cell_dim[0]] = color;
            }
        }
        else {
            const min = Math.min(y1, y2);
            const max = Math.max(y1, y2);
            for (let y = min; y < max; y += delta) {
                const x = Math.abs(deltaX) > 0 ? (y - b) / m : x2;
                view[Math.floor(x) + Math.floor(y) * this.cell_dim[0]] = color;
            }
        }
    }
    try_render_functions() {
        this.calc_bounds();
        let functions = this.functions;
        //this.screen_buf = [];
        this.screen_buf.forEach(buf => buf.ctx.clearRect(0, 0, this.cell_dim[0], this.cell_dim[1]));
        this.layer_manager.list.list.forEach((li, index) => {
            const text = li.textBox.text;
            if (!this.screen_buf[index]) {
                this.screen_buf.push(this.new_sprite());
            }
            if (!this.functions[index]) {
                const color = new RGB(index * 30 % 256, index * 50 % 256, index * 20 % 256, 255);
                const foo = new Function(text);
                foo.color = color;
                functions.push(foo);
            }
            else
                functions[index].compile(text);
        });
        functions.forEach((foo, index) => {
            const view = new Int32Array(this.screen_buf[index].imageData.data.buffer);
            this.screen_buf[index].ctx.strokeStyle = foo.color.htmlRBG();
            this.screen_buf[index].ctx.lineWidth = 2;
            //build table to be rendered
            foo.calc_for(this.x_min, this.x_max, (this.x_max - this.x_min) / this.cell_dim[0]);
            let last_x = 0;
            let last_y = ((-foo.table[0] - this.y_min) / this.deltaY) * this.cell_dim[1];
            this.screen_buf[index].ctx.beginPath();
            for (let i = 0; i < foo.table.length; i++) {
                const x = this.x_min + foo.dx * i;
                const y = -foo.table[i];
                const sy = ((y - this.y_min) / this.deltaY) * this.cell_dim[1];
                const sx = ((x - this.x_min) / this.deltaX) * this.cell_dim[0];
                //render to buffers
                if (sx !== last_x || sy !== last_y) {
                    this.screen_buf[index].ctx.moveTo(last_x, last_y);
                    this.screen_buf[index].ctx.lineTo(sx, sy);
                }
                last_x = sx;
                last_y = sy;
            }
            this.screen_buf[index].ctx.stroke();
        });
    }
    draw(canvas, ctx, x, y, width, height) {
        const font_size = 24;
        if (+ctx.font.split("px")[0] != font_size) {
            ctx.font = `${font_size}px Helvetica`;
        }
        if (this.draw_axises) {
            const screen_space_x_axis = (0 - this.y_min) / this.deltaY * this.cell_dim[1];
            const screen_space_y_axis = (0 - this.x_min) / this.deltaX * this.cell_dim[0];
            this.axises.ctx.clearRect(0, 0, this.cell_dim[0], this.cell_dim[1]);
            this.axises.ctx.beginPath();
            this.axises.ctx.moveTo(0, screen_space_x_axis);
            this.axises.ctx.lineTo(this.cell_dim[0], screen_space_x_axis);
            this.axises.ctx.moveTo(screen_space_y_axis, 0);
            this.axises.ctx.lineTo(screen_space_y_axis, this.cell_dim[1]);
            this.axises.ctx.stroke();
            ctx.drawImage(this.axises.image, x, y, width, height);
        }
        this.screen_buf.forEach((buf, index) => {
            //buf.refreshImage(); no need since we render directly onto sprite canvases
            if (!this.layer_manager.list.list[index] || this.layer_manager.list.list[index].checkBox.checked)
                ctx.drawImage(buf.image, x, y, width, height);
        });
        this.guiManager.draw(ctx);
    }
    cell_dist(cell1, cell2) {
        const c1x = cell1 % this.cell_dim[0];
        const c1y = Math.floor(cell1 / this.cell_dim[0]);
        const c2x = cell2 % this.cell_dim[0];
        const c2y = Math.floor(cell2 / this.cell_dim[0]);
        //return (Math.abs(c1x - c2x) + Math.abs(c1y - c2y));
        return Math.sqrt(Math.pow(c1x - c2x, 2) + Math.pow(c1y - c2y, 2));
    }
    column(cell) {
        return cell % this.cell_dim[0];
    }
    row(cell) {
        return Math.floor(cell / this.cell_dim[0]);
    }
    screen_to_index(x, y) {
        const x_scale = 1 / this.width * this.cell_dim[0];
        const y_scale = 1 / this.height * this.cell_dim[1];
        x *= x_scale;
        y *= y_scale;
        return Math.floor(x) + Math.floor(y) * this.cell_dim[0];
    }
    fill(start, color_p) {
        //const view:Int32Array = new Int32Array(this.screen_buf.imageData!.data.buffer);
        //const start_color = view[start];
        console.log("trying to fill");
        this.traverse_df(start, (index, color) => color_p, (index, color) => color == this.background_color.color);
    }
    traverse_df(start, apply, verifier) {
        const view = new Int32Array(this.screen_buf.imageData.data.buffer);
        const checked_map = new Int32Array(view.length);
        checked_map.fill(0, 0, checked_map.length);
        const stack = [];
        stack.push(start);
        while (stack.length > 0) {
            const current = stack.pop();
            if (!checked_map[current] && verifier(current, view[current])) {
                checked_map[current] = 1;
                view[current] = apply(current, view[current]);
                if (checked_map[current + 1] === 0 && this.row(current + 1) === this.row(current) && view[current + 1] !== undefined) {
                    stack.push(current + 1);
                }
                if (checked_map[current - 1] === 0 && this.row(current - 1) === this.row(current) && view[current - 1] !== undefined) {
                    stack.push(current - 1);
                }
                if (checked_map[current + this.cell_dim[0]] === 0 && this.column(current + this.cell_dim[0]) === this.column(current) && view[current + this.cell_dim[0]] !== undefined) {
                    stack.push(current + this.cell_dim[0]);
                }
                if (checked_map[current - this.cell_dim[0]] === 0 && this.column(current - this.cell_dim[0]) === this.column(current) && view[current - this.cell_dim[0]] !== undefined) {
                    stack.push(current - this.cell_dim[0]);
                }
            }
        }
    }
    update_state(delta_time) {
    }
}
;
const keyboardHandler = new KeyboardHandler();
async function main() {
    const canvas = document.getElementById("screen");
    const touchListener = new SingleTouchListener(canvas, true, true, false);
    canvas.onmousemove = (event) => {
    };
    canvas.addEventListener("wheel", (e) => {
        //e.preventDefault();
        const scaler = game.deltaX < game.width / 100 ? game.deltaX / game.width : (game.scale < 1 ? .0001 : (game.scale < 3 ? 0.01 : (game.scale < 10 ? 0.1 : (game.scale < 50 ? 0.5 : 1))));
        game.scale += e.deltaY * scaler;
        if (game.scale < 0) {
            game.scale = 0.000001;
        }
        game.try_render_functions();
    });
    canvas.width = getWidth();
    canvas.height = getHeight();
    canvas.style.cursor = "pointer";
    let counter = 0;
    const touchScreen = isTouchSupported();
    let height = getHeight();
    let width = getWidth();
    let game = new Game(0, 0, height, width);
    window.game = game;
    let low_fps = true;
    let draw = false;
    game.guiManager.createHandlers(keyboardHandler, touchListener);
    /*touchListener.registerCallBack("touchstart", (event:any) => true, (event:TouchMoveEvent) => {
    });
    touchListener.registerCallBack("touchend", (event:any) => true, (event:TouchMoveEvent) => {
    });*/
    touchListener.registerCallBack("touchmove", (event) => true, (event) => {
        const scaler = 1 / Math.pow(2, Math.log(game.scale)) / 40;
        game.y_translation -= scaler * (event.deltaY / game.height * game.cell_dim[1] / game.scale);
        game.x_translation -= scaler * (event.deltaX / game.width * game.cell_dim[0] / game.scale);
        game.try_render_functions();
    });
    keyboardHandler.registerCallBack("keydown", () => true, (event) => {
        if (!keyboardHandler.keysHeld["MetaLeft"] && !keyboardHandler.keysHeld["ControlLeft"] &&
            !keyboardHandler.keysHeld["MetaRight"] && !keyboardHandler.keysHeld["ControlRight"])
            event.preventDefault();
        game.try_render_functions();
        switch (event.code) {
            case ("ArrowUp"):
                break;
            case ("ArrowDown"):
                break;
            case ("ArrowLeft"):
                break;
            case ("ArrowRight"):
                break;
        }
    });
    let maybectx = canvas.getContext("2d");
    if (!maybectx)
        return;
    const ctx = maybectx;
    let start = Date.now();
    let dt = 1;
    const ostart = Date.now();
    let frame_count = 0;
    let instantaneous_fps = 0;
    const time_queue = new FixedSizeQueue(60 * 2);
    const header = document.getElementById("header");
    srand(Math.random() * max_32_bit_signed);
    const drawLoop = () => {
        frame_count++;
        //do stuff and render here
        if (getWidth() !== width || getHeight() !== height) {
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
        for (let i = 0; i < time_queue.length; i++) {
            const value = time_queue.get(i);
            sum += value;
            if (highest < value) {
                highest = value;
            }
        }
        game.update_state(dt);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        game.draw(canvas, ctx, game.x, game.y, game.width, game.height);
        if (frame_count % 10 === 0)
            instantaneous_fps = Math.floor(1000 / (low_fps ? highest : dt));
        let text = "";
        ctx.fillStyle = "#FFFFFF";
        text = `avg fps: ${Math.floor(1000 * time_queue.length / sum)}, ${low_fps ? "low" : "ins"} fps: ${instantaneous_fps}`;
        const text_width = ctx.measureText(text).width;
        ctx.strokeText(text, game.width - text_width - 10, menu_font_size());
        ctx.fillText(text, game.width - text_width - 10, menu_font_size());
        requestAnimationFrame(drawLoop);
    };
    drawLoop();
    game.resize(width, height - header.clientHeight - 100);
}
main();
