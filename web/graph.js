import { SingleTouchListener, isTouchSupported, MultiTouchListener, KeyboardHandler } from './io.js';
import { getHeight, getWidth, RGB, Sprite, GuiCheckList, GuiButton, SimpleGridLayoutManager, GuiLabel, GuiSlider, GuiCheckBox, StateManagedUI } from './gui.js';
import { sign, srand, clamp, max_32_bit_signed, round_with_precision, FixedSizeQueue } from './utils.js';
import { menu_font_size, SquareAABBCollidable } from './game_utils.js';
window.sec = (x) => 1 / Math.sin(x);
window.csc = (x) => 1 / Math.cos(x);
window.cotan = (x) => 1 / Math.tan(x);
window.sin = Math.sin;
window.cos = Math.cos;
window.tan = Math.tan;
window.asin = Math.asin;
window.acos = Math.acos;
window.atan = Math.atan;
window.log = Math.log;
window.pow = Math.pow;
window.sqrt = Math.sqrt;
window.derx = (foo, x, dx) => {
    return (foo(x + dx) - foo(x)) / dx;
};
window.dderx = (foo, x, dx) => {
    return (derx(foo, x + dx, dx) - derx(foo, x, dx)) / dx;
};
class LayerManagerTool {
    constructor(limit = 16, callback_add_layer, callback_checkbox_event, callback_delete_layer, callback_layer_count, callback_onclick_event, callback_slide_event, callback_swap_layers, callback_get_error_parallel_array, callback_get_non_error_background_color) {
        this.callback_add_layer = callback_add_layer;
        this.callback_checkbox_event = callback_checkbox_event;
        this.callback_delete_layer = callback_delete_layer;
        this.callback_layer_count = callback_layer_count;
        this.callback_onclick_event = callback_onclick_event;
        this.callback_slide_event = callback_slide_event;
        this.callback_swap_layers = callback_swap_layers;
        this.callback_get_error_parallel_array = callback_get_error_parallel_array;
        this.callback_get_non_error_background_color = callback_get_non_error_background_color;
        this.layersLimit = limit;
        this.layoutManager = new SimpleGridLayoutManager([100, 24], [200, getHeight() - 130]);
        this.list = new GuiCheckList([1, this.layersLimit], [this.layoutManager.width(), getHeight() - 280], 20, false, this.callback_swap_layers, (event) => {
            const index = this.list.list.findIndex(element => element.slider === event.element);
            this.callback_slide_event(index, event.value);
        }, callback_get_error_parallel_array, callback_get_non_error_background_color);
        this.buttonAddLayer = new GuiButton(() => { this.pushList(`x*x*${this.runningId++}`); this.callback_onclick_event(0); }, "Add Function", this.layoutManager.width() / 2, 75, 16);
        this.layoutManager.addElement(new GuiLabel("Functions list:", this.layoutManager.width()));
        this.layoutManager.addElement(this.list);
        this.layoutManager.addElement(this.buttonAddLayer);
        this.layoutManager.addElement(new GuiButton(() => this.deleteItem(), "Delete", this.layoutManager.width() / 2, 75, 16));
        this.runningId = 2;
        this.pushList(`sin(x*x)`);
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
            this.compiled = eval(`(x, dx) => ${source}`);
        }
        catch (e) {
            console.log(e.message);
            this.error_message = e.message;
        }
        this.local_maxima = [];
        this.local_minima = [];
        this.zeros = [];
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
                this.compiled = eval(`(x, dx) => ${source}`);
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
    calc_x_minmax(x, y1, y2, y3) {
        const dxsq = this.dx * this.dx;
        const xsq = x * x;
        return -(((dxsq * y1 - xsq * y1 + 2 * x * y2 - y3) * (-this.dx * x * y1 + xsq * y1 + this.dx * y2 - 2 * x * y2 +
            y3)) / dxsq * dxsq);
    }
    calc_for(x_min, x_max, dx, calc_minmax, calc_zeros) {
        if (this.error_message === null) {
            this.x_max = x_max;
            this.x_min = x_min;
            this.dx = dx;
            this.table.splice(0, this.table.length);
            this.zeros.splice(0, this.zeros.length);
            this.local_maxima.splice(0, this.local_maxima.length);
            this.local_minima.splice(0, this.local_minima.length);
            try {
                const iterations = (this.x_max - this.x_min) / this.dx;
                for (let j = 0; j < iterations; j++) {
                    const x = this.x_min + j * dx;
                    this.table.push(this.compiled(x, this.dx));
                }
            }
            catch (error) {
                console.log(error.message);
                this.error_message = error.message;
            }
            let x = x_min;
            const max = getWidth() / 2;
            const o_opt_count = 128;
            let optimization_count;
            for (let i = 1; i < this.table.length - 1; i++) {
                const number_calced = Math.min((this.zeros.length + this.local_maxima.length + this.local_minima.length), max);
                optimization_count = 14 + o_opt_count * (max - number_calced) / max;
                const prev_y = this.table[i - 1];
                x = x_min + i * dx;
                const y = this.table[i];
                const next_y = this.table[i + 1];
                const prev_delta_y = prev_y - y;
                const current_delta_y = y - next_y;
                const is_maxima = prev_delta_y < 0 && current_delta_y > 0;
                const is_minima = prev_delta_y > 0 && current_delta_y < 0;
                if (calc_zeros) {
                    if ((prev_y < 0 && y > 0) || (prev_y > 0 && y < 0)) {
                        this.zeros.push(x);
                        this.zeros.push(y);
                    }
                    else if (is_maxima ||
                        is_minima || y === 0)
                        if (Math.abs(y) < dx) {
                            this.zeros.push(x);
                            this.zeros.push(y);
                        }
                }
                if (calc_minmax) {
                    if (is_maxima) // maxima
                     {
                        this.local_maxima.push(x);
                        this.local_maxima.push(y);
                    }
                    else if (is_minima) //minima
                     {
                        this.local_minima.push(x);
                        this.local_minima.push(y);
                    }
                }
            }
        }
        return this.table;
    }
    dist(a, b) {
        return Math.abs(a - b);
    }
    optimize_xmax(min_x, max_x, it) {
        while (it > 0) {
            const delta = max_x - min_x;
            const dx = delta * (1 / 5);
            const mid = (min_x + max_x) * (1 / 2);
            const ly = this.compiled(min_x + dx, this.dx);
            const hy = this.compiled(max_x - dx, this.dx);
            if (ly > hy)
                max_x = mid;
            else
                min_x = mid;
            it--;
        }
        return (min_x + max_x) / 2;
    }
    optimize_xmin(min_x, max_x, it) {
        const y = [];
        while (it > 0) {
            const delta = max_x - min_x;
            const dx = delta * (1 / 5);
            const mid = (min_x + max_x) * (1 / 2);
            const ly = this.compiled(min_x + dx, this.dx);
            const hy = this.compiled(max_x - dx, this.dx);
            if (ly < hy)
                max_x = mid;
            else
                min_x = mid;
            it--;
        }
        return (min_x + max_x) / 2;
    }
    optimize_zero(min_x, max_x, it) {
        const y = [];
        while (it > 0) {
            const delta = max_x - min_x;
            const dx = delta * (1 / 5);
            const mid = (min_x + max_x) * (1 / 2);
            const ly = this.compiled(min_x + dx, this.dx);
            const hy = this.compiled(max_x - dx, this.dx);
            if (Math.abs(ly) < Math.abs(hy))
                max_x = mid;
            else
                min_x = mid;
            it--;
        }
        return (min_x + max_x) / 2;
    }
    index_to_x(index) {
        return this.x_min + index * this.dx;
    }
    closest_max(x) {
        if (this.local_maxima.length > 0) {
            let closest_max = 0;
            let dist = Math.abs(x - this.local_maxima[closest_max]);
            for (let i = 2; i < this.local_maxima.length; i += 2) {
                const xi = this.local_maxima[i];
                const dist_xi = Math.abs(x - xi);
                if (dist > dist_xi) {
                    dist = dist_xi;
                    closest_max = i;
                }
            }
            return closest_max;
        }
        return null;
    }
    closest_min(x) {
        let closest_min = 0;
        let dist = this.local_minima.length > 0 ? Math.abs(x - this.local_minima[closest_min]) : null;
        if (dist !== null) {
            for (let i = 2; i < this.local_minima.length; i += 2) {
                const xi = this.local_minima[i];
                const dist_xi = Math.abs(x - xi);
                if (dist > dist_xi) {
                    dist = dist_xi;
                    closest_min = i;
                }
            }
            return closest_min;
        }
        return null;
    }
    closest_zero(x) {
        let closest_zero = 0;
        let dist = this.zeros.length > 0 ? Math.abs(x - this.zeros[closest_zero]) : null;
        if (dist !== null) {
            for (let i = 2; i < this.zeros.length; i += 2) {
                const xi = this.zeros[i];
                const dist_xi = Math.abs(x - xi);
                if (dist > dist_xi) {
                    dist = dist_xi;
                    closest_zero = i;
                }
            }
            return closest_zero;
        }
        return null;
    }
    call(x) {
        if (this.error_message === null) {
            try {
                return this.compiled(x, this.dx);
            }
            catch (error) {
                console.log(error.message);
                this.error_message = error.message;
            }
        }
        return null;
    }
}
;
class GridUIState {
    constructor(grid) {
        this.grid = grid;
    }
    draw(ctx, canvas, x, y, width, height) {
        throw new Error('Method not implemented.');
    }
    handleKeyboardEvents(type, event) {
        throw new Error('Method not implemented.');
    }
    handleTouchEvents(type, event) {
        throw new Error('Method not implemented.');
    }
    transition(delta_time) {
        throw new Error('Method not implemented.');
    }
}
;
class FollowCursor extends GridUIState {
    constructor(grid) {
        super(grid);
    }
    draw(ctx, canvas, x, y, width, height) {
        this.grid.render_labels_floating(ctx);
        if (this.grid.draw_point_labels)
            this.grid.render_x_y_label_screen_space(ctx, this.grid.touchListener.touchPos);
    }
    handleKeyboardEvents(type, event) {
        throw new Error('Method not implemented.');
    }
    handleTouchEvents(type, event) {
        throw new Error('Method not implemented.');
    }
    transition(delta_time) {
        if (this.grid.chkbx_render_zeros.checked) {
            this.grid.repaint = true;
            return new FollowNearestZero(this.grid);
        }
        else if (this.grid.chkbx_render_min_max.checked) {
            this.grid.repaint = true;
            return new FollowNearestMinMax(this.grid);
        }
        else if (this.grid.chkbx_render_intersections.checked) {
            this.grid.repaint = true;
            return new FollowNearestIntersection(this.grid);
        }
        return this;
    }
}
;
class FollowNearestZero extends GridUIState {
    constructor(grid) {
        super(grid);
    }
    draw(ctx, canvas, x, y, width, height) {
        this.grid.render_labels_zeros(ctx);
    }
    handleKeyboardEvents(type, event) {
        throw new Error('Method not implemented.');
    }
    handleTouchEvents(type, event) {
        throw new Error('Method not implemented.');
    }
    to_state(state) {
        this.grid.repaint = true;
        this.grid.chkbx_render_zeros.checked = false;
        this.grid.chkbx_render_zeros.refresh();
        this.grid.options_gui_manager.refresh();
        return new state(this.grid);
    }
    transition(delta_time) {
        if (this.grid.chkbx_render_min_max.checked) {
            return this.to_state(FollowNearestMinMax);
        }
        else if (this.grid.chkbx_render_intersections.checked) {
            return this.to_state(FollowNearestIntersection);
        }
        else if (!this.grid.chkbx_render_zeros.checked) {
            return this.to_state(FollowCursor);
        }
        return this;
    }
}
;
class FollowNearestMinMax extends GridUIState {
    constructor(grid) {
        super(grid);
    }
    draw(ctx, canvas, x, y, width, height) {
        this.grid.render_labels_min(ctx);
        this.grid.render_labels_max(ctx);
    }
    handleKeyboardEvents(type, event) {
        throw new Error('Method not implemented.');
    }
    handleTouchEvents(type, event) {
        throw new Error('Method not implemented.');
    }
    to_state(state) {
        this.grid.repaint = true;
        this.grid.chkbx_render_min_max.checked = false;
        this.grid.chkbx_render_min_max.refresh();
        this.grid.options_gui_manager.refresh();
        return new state(this.grid);
    }
    transition(delta_time) {
        if (this.grid.chkbx_render_zeros.checked) {
            return this.to_state(FollowNearestZero);
        }
        else if (this.grid.chkbx_render_intersections.checked) {
            return this.to_state(FollowNearestIntersection);
        }
        else if (!this.grid.chkbx_render_min_max.checked) {
            return this.to_state(FollowCursor);
        }
        return this;
    }
}
;
class FollowNearestIntersection extends GridUIState {
    constructor(grid) {
        super(grid);
    }
    draw(ctx, canvas, x, y, width, height) {
        this.grid.render_labels_intersection(ctx);
    }
    handleKeyboardEvents(type, event) {
        throw new Error('Method not implemented.');
    }
    handleTouchEvents(type, event) {
        throw new Error('Method not implemented.');
    }
    to_state(state) {
        this.grid.repaint = true;
        this.grid.chkbx_render_intersections.checked = false;
        this.grid.chkbx_render_intersections.refresh();
        this.grid.options_gui_manager.refresh();
        return new state(this.grid);
    }
    transition(delta_time) {
        if (this.grid.chkbx_render_zeros.checked) {
            return this.to_state(FollowNearestZero);
        }
        else if (this.grid.chkbx_render_min_max.checked) {
            return this.to_state(FollowNearestMinMax);
        }
        else if (!this.grid.chkbx_render_intersections.checked) {
            return this.to_state(FollowCursor);
        }
        return this;
    }
}
;
//ui should switch between 
//free form following cursor exactly
//finding nearest minima/maxima to cursor
class FunctionPoint extends SquareAABBCollidable {
    constructor(foo, x, y, width, height) {
        super(x, y, width, height);
        this.foo = foo;
    }
}
;
class Game extends SquareAABBCollidable {
    constructor(multi_touchListener, touchListener, x, y, width, height) {
        super(x, y, width, height);
        this.intersections = [];
        this.last_selected_item = 0;
        this.selected_item = 0;
        this.state_manager_grid = new StateManagedUI(new FollowCursor(this));
        this.scaling_multiplier = 1;
        this.ui_alpha = 0;
        this.repaint = true;
        this.multi_touchListener = multi_touchListener;
        this.touchListener = touchListener;
        this.functions = [];
        this.draw_axises = true;
        this.draw_axis_labels = true;
        this.draw_point_labels = true;
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
        this.cell_dim = [getWidth(), getHeight() - 50];
        this.init(this.cell_dim[0], this.cell_dim[1], this.cell_dim[0], this.cell_dim[1]);
        this.guiManager = new SimpleGridLayoutManager([1, 1000], [this.graph_start_x, getHeight()], 0, 30);
        this.layer_manager = this.new_layer_manager();
        this.axises = this.new_sprite();
        this.main_buf = this.new_sprite();
        this.guiManager.addElement(this.layer_manager.layoutManager);
        this.guiManager.addElement(new GuiSlider(0, [this.guiManager.width(), 50], (e) => {
            this.scaling_multiplier = e.value * 4 + 1;
        }));
        this.guiManager.activate();
        const touch_mod = isTouchSupported() ? 38 : 0;
        this.options_gui_manager = new SimpleGridLayoutManager([2, 40], [200, 300 + touch_mod * 5.5], this.guiManager.x + this.guiManager.width(), this.guiManager.y);
        this.options_gui_manager.addElement(new GuiLabel("Show axises", 100));
        this.options_gui_manager.addElement(new GuiLabel("Show labels", 100));
        this.options_gui_manager.addElement(new GuiCheckBox((event) => {
            this.draw_axises = event.checkBox.checked;
            this.repaint = true;
        }, 50 + touch_mod, 50 + touch_mod, this.draw_axis_labels));
        this.options_gui_manager.addElement(new GuiCheckBox((event) => {
            this.draw_axis_labels = event.checkBox.checked;
            this.repaint = true;
        }, 50 + touch_mod, 50 + touch_mod, this.draw_axis_labels));
        chkbx_render_zeros: GuiCheckBox;
        const show_label = new GuiLabel("Show point", 100, 18, 50 + touch_mod);
        this.options_gui_manager.addElement(show_label);
        this.options_gui_manager.addElement(new GuiCheckBox((event) => {
            this.draw_point_labels = event.checkBox.checked;
        }, 50 + touch_mod, 50 + touch_mod, this.draw_axis_labels));
        const minmax_label = new GuiLabel("Min Max", 100, 18, 50 + touch_mod);
        this.options_gui_manager.addElement(minmax_label);
        this.chkbx_render_min_max = new GuiCheckBox((event) => {
        }, 50 + touch_mod, 50 + touch_mod, false);
        this.options_gui_manager.addElement(this.chkbx_render_min_max);
        const zeros_label = new GuiLabel("Zeros", 100, 18, 50 + touch_mod);
        this.options_gui_manager.addElement(zeros_label);
        this.chkbx_render_zeros = new GuiCheckBox((event) => {
        }, 50 + touch_mod, 50 + touch_mod, false);
        this.options_gui_manager.addElement(this.chkbx_render_zeros);
        const intersections_label = new GuiLabel("Intersections", 100, 18, 50 + touch_mod);
        this.options_gui_manager.addElement(intersections_label);
        this.chkbx_render_intersections = new GuiCheckBox((event) => {
        }, 50 + touch_mod, 50 + touch_mod, false);
        this.options_gui_manager.addElement(this.chkbx_render_intersections);
        this.options_gui_manager.activate();
        this.repaint = true;
    }
    init(width, height, cell_width, cell_height) {
        this.resize(width, height);
        this.background_color = new RGB(0, 0, 0, 0);
        this.cell_dim = [cell_width, cell_height];
        this.main_buf = this.new_sprite();
        this.axises = this.new_sprite();
        this.repaint = true;
    }
    new_layer_manager() {
        const layer_manager = new LayerManagerTool(10, () => { this.add_layer(); }, (layer, state) => this.repaint = true, (layer) => { this.functions.splice(layer, 1); this.repaint = true; }, () => this.functions.length, (layer) => this.repaint = true, (layer, slider_value) => { console.log('layer', layer, 'slider val', slider_value); return 0; }, (l1, l2) => { this.swap_layers(l1, l2); this.repaint = true; }, (layer) => this.functions[layer] ? this.functions[layer].error_message : null, (layer) => {
            return this.functions[layer] ? this.functions[layer].color : null;
        });
        if (this.layer_manager) {
            layer_manager.list.list = this.layer_manager.list.list;
        }
        return layer_manager;
    }
    calc_bounds() {
        this.x_min = this.x_translation - 1 / this.scale;
        this.x_max = this.x_translation + 1 / this.scale;
        this.deltaX = this.x_max - this.x_min;
        this.y_min = this.y_translation - this.deltaX / 2;
        this.y_max = this.y_translation + this.deltaX / 2;
        this.deltaY = this.y_max - this.y_min;
    }
    add_layer() {
        this.functions.push(new Function(""));
        this.repaint = true;
    }
    swap_layers(l1, l2) {
        const temp = this.functions.splice(l1, 1)[0];
        this.functions.splice(l2, 0, temp);
    }
    set_place(index, color) {
        const view = new Int32Array(this.main_buf.imageData.data.buffer);
        if (view[index] !== undefined) {
            view[index] = color;
            return true;
        }
        return false;
    }
    get_place(index) {
        const view = new Int32Array(this.main_buf.imageData.data.buffer);
        if (view[index] !== undefined) {
            return view[index];
        }
        return null;
    }
    is_background(index) {
        const view = new Int32Array(this.main_buf.imageData.data.buffer);
        return this.get_place(index) == this.background_color.color;
    }
    clear_place(removed) {
        const view = new Int32Array(this.main_buf.imageData.data.buffer);
        if (view[removed] !== undefined) {
            view[removed] = this.background_color.color;
            return true;
        }
        return false;
    }
    restart_game() {
        this.init(this.width, this.height, this.cell_dim[0], this.cell_dim[1]);
    }
    new_sprite() {
        const pixels = (new Array(this.cell_dim[1] * this.cell_dim[0])).fill(this.background_color, 0, this.cell_dim[1] * this.cell_dim[0]);
        return new Sprite(pixels, this.cell_dim[0], this.cell_dim[1], false);
    }
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.calc_bounds();
    }
    try_render_functions() {
        this.calc_bounds();
        let functions = this.functions;
        this.layer_manager.list.list.forEach((li, index) => {
            const text = li.textBox.text;
            if (!this.main_buf) {
                this.main_buf = (this.new_sprite());
            }
            if (!this.functions[index]) {
                const color = new RGB(index * 30 % 256, (index + 1) * 150 % 256, index * 85 % 256, 255);
                const foo = new Function(text);
                foo.color = color;
                functions.push(foo);
            }
            else
                functions[index].compile(text);
        });
        const view = new Int32Array(this.main_buf.imageData.data.buffer);
        functions.forEach((foo, index) => {
            if (this.layer_manager.list.list[index] && this.layer_manager.list.list[index].checkBox.checked) {
                //build table to be rendered
                foo.calc_for(this.x_min, this.x_max, (this.x_max - this.x_min) / this.cell_dim[0] / 10 * Math.ceil(this.functions.length / 2), this.chkbx_render_min_max.checked, this.chkbx_render_zeros.checked);
                //render table to main buffer
                let last_x = 0;
                let last_y = ((-foo.table[0] - this.y_min) / this.deltaY) * this.cell_dim[1];
                this.main_buf.ctx.beginPath();
                this.main_buf.ctx.strokeStyle = foo.color.htmlRBG();
                this.main_buf.ctx.lineWidth = 2;
                let minima_iterator = 0;
                let maxima_iterator = 0;
                for (let i = 0; i < foo.table.length; i++) {
                    const x = this.x_min + foo.dx * i;
                    const y = -foo.table[i];
                    const sy = ((y - this.y_min) / this.deltaY) * this.cell_dim[1];
                    const sx = ((x - this.x_min) / this.deltaX) * this.cell_dim[0];
                    //render to buffers
                    if (sx !== last_x || sy !== last_y) {
                        this.main_buf.ctx.moveTo(last_x, last_y);
                        this.main_buf.ctx.lineTo(sx, sy);
                    }
                    const dim = 6;
                    last_x = sx;
                    last_y = sy;
                }
                this.main_buf.ctx.stroke();
            }
        });
        this.intersections.splice(0, this.intersections.length);
        if (this.chkbx_render_intersections.checked && this.selected_item !== this.last_selected_item) {
            const fun1 = functions[this.selected_item];
            const fun2 = functions[this.last_selected_item];
            if (fun1 && fun2) {
                for (let j = 0; j < functions[0].table.length - 1; j++) {
                    if (fun1.table[j + 1] - fun2.table[j + 1] === 0) {
                        this.intersections.push(fun1.index_to_x(j));
                        this.intersections.push(fun1.table[j]);
                    }
                    else if (sign(fun1.table[j] - fun2.table[j]) !== sign(fun1.table[j + 1] - fun2.table[j + 1])) {
                        //const optimized_runs = getWidth();
                        //const optimization_iterations = Math.floor(132 - 132 * ((this.intersections.length<optimized_runs?this.intersections.length:optimized_runs) / optimized_runs));
                        //const optimized_x = this.optimize_intersection(fun1, fun2, fun1.index_to_x(j), fun1.index_to_x(j+1), optimization_iterations + 12);
                        this.intersections.push(fun1.index_to_x(j));
                        this.intersections.push(fun1.table[j]);
                    }
                }
            }
        }
        this.main_buf.ctx.beginPath();
        this.main_buf.ctx.stroke();
    }
    optimize_intersection(fun1, fun2, min_x, max_x, it) {
        const y = [];
        while (it > 0) {
            const delta = max_x - min_x;
            const dx = delta * (1 / 5);
            const mid = (min_x + max_x) * (1 / 2);
            const ly1 = fun1.compiled(min_x + dx, fun1.dx);
            const hy1 = fun1.compiled(max_x - dx, fun1.dx);
            const ly2 = fun2.compiled(min_x + dx, fun2.dx);
            const hy2 = fun2.compiled(max_x - dx, fun2.dx);
            if (Math.abs(ly1 - ly2) < Math.abs(hy1 - hy2))
                max_x = mid;
            else
                min_x = mid;
            it--;
        }
        return (min_x + max_x) / 2;
    }
    render_axises(canvas, ctx, x, y, width, height) {
        if (this.draw_axises) {
            const font_size = 20;
            const screen_space_x_axis = -this.y_min >= 0 && -this.y_max <= 0 ? (0 - this.y_min) / this.deltaY * this.cell_dim[1] : -this.y_min < 0 ? 0 : this.main_buf.height;
            let screen_space_y_axis = -this.x_min >= 0 && -this.x_max <= 0 ? (0 - this.x_min) / this.deltaX * this.cell_dim[0] : -this.x_min < 0 ? 0 : this.main_buf.width;
            this.axises.ctx.clearRect(0, 0, this.cell_dim[0], this.cell_dim[1]);
            this.axises.ctx.beginPath();
            this.axises.ctx.lineWidth = 4;
            this.axises.ctx.strokeStyle = "#FFFFFF";
            this.axises.ctx.moveTo(0, screen_space_x_axis);
            this.axises.ctx.lineTo(this.cell_dim[0], screen_space_x_axis);
            this.axises.ctx.moveTo(screen_space_y_axis, 0);
            this.axises.ctx.lineTo(screen_space_y_axis, this.cell_dim[1]);
            this.axises.ctx.stroke();
            this.axises.ctx.beginPath();
            this.axises.ctx.lineWidth = 3;
            this.axises.ctx.strokeStyle = "#000000";
            this.axises.ctx.moveTo(0, screen_space_x_axis);
            this.axises.ctx.lineTo(this.cell_dim[0], screen_space_x_axis);
            this.axises.ctx.moveTo(screen_space_y_axis, 0);
            this.axises.ctx.lineTo(screen_space_y_axis, this.cell_dim[1]);
            ctx.stroke();
            if (this.draw_axis_labels) {
                const msd_x = Math.pow(10, Math.floor(-Math.log10(this.deltaX)));
                const delta_x = Math.floor(this.deltaX * msd_x * 10) / (msd_x * 100);
                let closest_start_x = Math.ceil(this.x_min * msd_x * 100) / (msd_x * 100);
                closest_start_x -= closest_start_x % delta_x;
                const msd_y = Math.pow(10, Math.ceil(-Math.log10(this.deltaY)));
                const delta_y = Math.floor(this.deltaY * msd_y * 10) / (msd_y * 100);
                let closest_start_y = Math.ceil(this.y_min * msd_y * 10) / (msd_y * 10);
                closest_start_y -= closest_start_y % delta_y;
                let i = closest_start_x;
                let last_render_x = -1;
                let last_render_text_width = 0;
                ctx.font = `${font_size}px Helvetica`;
                ctx.strokeStyle = "#FFFFFF";
                ctx.lineWidth = 3;
                while (i < this.x_max) {
                    const screen_x = ((i - this.x_min) / this.deltaX) * this.main_buf.width;
                    ctx.strokeRect(screen_x - 3, screen_space_x_axis - 3, 6, 6);
                    ctx.fillRect(screen_x - 3, screen_space_x_axis - 3, 6, 6);
                    {
                        const screen_x = ((i + delta_x / 2 - this.x_min) / this.deltaX) * this.main_buf.width;
                        ctx.strokeRect(screen_x - 3, screen_space_x_axis - 3, 6, 6);
                        ctx.fillRect(screen_x - 3, screen_space_x_axis - 3, 6, 6);
                    }
                    if (screen_x > last_render_x + last_render_text_width + 10 && Math.abs(i) >= delta_x * 15 / 16) {
                        last_render_x = screen_x + 3;
                        const text = this.format_number(i);
                        const text_width = ctx.measureText(text).width;
                        last_render_text_width = text_width;
                        let text_y = screen_space_x_axis;
                        if (text_y - font_size < 0) {
                            text_y += font_size + 10;
                        }
                        ctx.strokeText(text, screen_x + 3, text_y - 6);
                        ctx.fillText(text, screen_x + 3, text_y - 6);
                    }
                    i += delta_x;
                }
                i = closest_start_y;
                let last_render_y = -font_size;
                const old_screen_space_y_axis = screen_space_y_axis;
                while (i <= this.y_max) {
                    const screen_y = (i - this.y_min) / this.deltaY * this.main_buf.height;
                    screen_space_y_axis = old_screen_space_y_axis;
                    ctx.strokeRect(old_screen_space_y_axis - 3, screen_y - 3, 6, 6);
                    ctx.fillRect(old_screen_space_y_axis - 3, screen_y - 3, 6, 6);
                    {
                        const screen_y = (i + delta_y / 2 - this.y_min) / this.deltaY * this.main_buf.height;
                        screen_space_y_axis = old_screen_space_y_axis;
                        ctx.strokeRect(old_screen_space_y_axis - 3, screen_y - 3, 6, 6);
                        ctx.fillRect(old_screen_space_y_axis - 3, screen_y - 3, 6, 6);
                    }
                    if (screen_y > last_render_y + font_size * 2) {
                        last_render_y = screen_y;
                        const text = Math.abs(i) >= delta_y / 16 ? this.format_number(-i) : 0 + "";
                        const text_width = ctx.measureText(text).width;
                        if (screen_space_y_axis + text_width > this.main_buf.width) {
                            screen_space_y_axis -= text_width + 10;
                        }
                        ctx.strokeText(text, screen_space_y_axis + 3, screen_y - 4);
                        ctx.fillText(text, screen_space_y_axis + 3, screen_y - 4);
                    }
                    i += delta_y;
                }
            }
            this.axises.ctx.stroke();
            ctx.drawImage(this.axises.image, x, y, width, height);
        }
    }
    draw(canvas, ctx, x, y, width, height) {
        const font_size = 24;
        if (+ctx.font.split("px")[0] != font_size) {
            ctx.font = `${font_size}px Helvetica`;
        }
        if (this.repaint) {
            this.main_buf.ctx.imageSmoothingEnabled = false;
            this.main_buf.ctx.clearRect(0, 0, this.main_buf.width, this.main_buf.height);
            this.repaint = false;
            this.try_render_functions();
            this.render_axises(this.main_buf.image, this.main_buf.ctx, x, y, this.main_buf.width, this.main_buf.height);
        }
        ctx.drawImage(this.main_buf.image, x, y);
        if (!this.multi_touchListener.registeredMultiTouchEvent) {
            if (this.ui_alpha !== 1)
                ctx.globalAlpha = this.ui_alpha;
            this.guiManager.draw(ctx);
            this.layer_manager.list.pos[0] = this.guiManager.x;
            this.layer_manager.list.pos[1] = this.guiManager.y;
            this.options_gui_manager.draw(ctx);
            if (this.ui_alpha !== 1)
                ctx.globalAlpha = 1;
        }
        this.state_manager_grid.draw(ctx, canvas, x, y, width, height);
    }
    render_labels_floating(ctx) {
        if (this.draw_point_labels) {
            const touchPos = this.touchListener.touchPos;
            const screen_space_x_axis = -this.y_min >= 0 && -this.y_max <= 0 ? (0 - this.y_min) / this.deltaY * this.cell_dim[1] : -this.y_min < 0 ? 0 : this.main_buf.height;
            let screen_space_y_axis = -this.x_min >= 0 && -this.x_max <= 0 ? (0 - this.x_min) / this.deltaX * this.cell_dim[0] : -this.x_min < 0 ? 0 : this.main_buf.width;
            let world_y = 0;
            const selected_function = this.functions[this.layer_manager.list.selected()];
            if (selected_function && this.layer_manager.list.selectedItem()?.checkBox.checked) {
                try {
                    const world_x = (touchPos[0] / this.width * this.deltaX) + selected_function.x_min;
                    world_y = selected_function.compiled(world_x);
                    this.render_x_y_label_world_space(ctx, world_x, world_y);
                }
                catch (error) { }
                ctx.beginPath();
                const y = ((-world_y - this.y_min) / this.deltaY) * this.height;
                ctx.moveTo(screen_space_y_axis, y);
                ctx.lineTo(touchPos[0], y);
                ctx.moveTo(touchPos[0], screen_space_x_axis);
                ctx.lineTo(touchPos[0], y);
                ctx.stroke();
            }
        }
    }
    render_labels_zeros(ctx) {
        if (this.draw_point_labels) {
            const touchPos = this.touchListener.touchPos;
            const screen_space_x_axis = -this.y_min >= 0 && -this.y_max <= 0 ? (0 - this.y_min) / this.deltaY * this.cell_dim[1] : -this.y_min < 0 ? 0 : this.main_buf.height;
            let screen_space_y_axis = -this.x_min >= 0 && -this.x_max <= 0 ? (0 - this.x_min) / this.deltaX * this.cell_dim[0] : -this.x_min < 0 ? 0 : this.main_buf.width;
            let world_y = 0;
            let world_x = 0;
            const selected_function = this.functions[this.layer_manager.list.selected()];
            if (selected_function && this.layer_manager.list.selectedItem()?.checkBox.checked) {
                const touch_world_x = selected_function.x_min + touchPos[0] / this.main_buf.width * this.deltaX;
                const closest_max = selected_function.closest_zero(touch_world_x);
                let x_index = closest_max;
                if (closest_max !== null) {
                    world_x = selected_function.zeros[x_index];
                    world_y = selected_function.zeros[x_index + 1];
                    world_x = selected_function.optimize_zero(selected_function.zeros[x_index] - selected_function.dx, selected_function.zeros[x_index] + selected_function.dx, 128);
                    world_y = selected_function.call(world_x);
                    this.render_x_y_label_world_space(ctx, world_x, world_y, 2, +ctx.font.split("px")[0]);
                }
            }
        }
    }
    render_labels_max(ctx) {
        if (this.draw_point_labels) {
            const touchPos = this.touchListener.touchPos;
            const screen_space_x_axis = -this.y_min >= 0 && -this.y_max <= 0 ? (0 - this.y_min) / this.deltaY * this.cell_dim[1] : -this.y_min < 0 ? 0 : this.main_buf.height;
            let screen_space_y_axis = -this.x_min >= 0 && -this.x_max <= 0 ? (0 - this.x_min) / this.deltaX * this.cell_dim[0] : -this.x_min < 0 ? 0 : this.main_buf.width;
            let world_y = 0;
            let world_x = 0;
            const selected_function = this.functions[this.layer_manager.list.selected()];
            if (selected_function && this.layer_manager.list.selectedItem()?.checkBox.checked) {
                const touch_world_x = selected_function.x_min + touchPos[0] / this.main_buf.width * this.deltaX;
                const closest_max = selected_function.closest_max(touch_world_x);
                let x_index = closest_max;
                if (closest_max !== null) {
                    world_x = selected_function.local_maxima[x_index];
                    world_y = selected_function.local_maxima[x_index + 1];
                    world_x = selected_function.optimize_xmax(world_x - selected_function.dx, world_x + selected_function.dx, 128);
                    world_y = selected_function.compiled(world_x, selected_function.dx);
                    selected_function.local_maxima[x_index] = world_x;
                    selected_function.local_maxima[x_index + 1] = world_y;
                }
                if (x_index !== null) {
                    this.render_x_y_label_world_space(ctx, world_x, world_y, 2, -1 * +ctx.font.split("px")[0]);
                    const sx = (world_x - this.x_min) / this.deltaX * this.main_buf.width;
                    ctx.beginPath();
                    const y = ((-world_y - this.y_min) / this.deltaY) * this.height;
                    ctx.moveTo(screen_space_y_axis, y);
                    ctx.lineTo(sx, y);
                    ctx.moveTo(sx, screen_space_x_axis);
                    ctx.lineTo(sx, y);
                    ctx.stroke();
                }
            }
        }
    }
    closest_intersection(x) {
        if (this.intersections.length > 0) {
            let closest_intersection = 0;
            let dist = Math.abs(x - this.intersections[closest_intersection]);
            for (let i = 2; i < this.intersections.length; i += 2) {
                const xi = this.intersections[i];
                const dist_xi = Math.abs(x - xi);
                if (dist > dist_xi) {
                    dist = dist_xi;
                    closest_intersection = i;
                }
            }
            return closest_intersection;
        }
        return null;
    }
    render_labels_intersection(ctx) {
        if (this.draw_point_labels) {
            const touchPos = this.touchListener.touchPos;
            const screen_space_x_axis = -this.y_min >= 0 && -this.y_max <= 0 ? (0 - this.y_min) / this.deltaY * this.cell_dim[1] : -this.y_min < 0 ? 0 : this.main_buf.height;
            let screen_space_y_axis = -this.x_min >= 0 && -this.x_max <= 0 ? (0 - this.x_min) / this.deltaX * this.cell_dim[0] : -this.x_min < 0 ? 0 : this.main_buf.width;
            let world_y = 0;
            let world_x = 0;
            const selected_function = this.functions[this.layer_manager.list.selected()];
            if (selected_function && this.layer_manager.list.selectedItem()?.checkBox.checked &&
                this.functions[this.selected_item] && this.functions[this.last_selected_item]) {
                const touch_world_x = selected_function.x_min + touchPos[0] / this.main_buf.width * this.deltaX;
                const closest_intersection = this.closest_intersection(touch_world_x);
                let x_index = closest_intersection;
                if (closest_intersection !== null) {
                    world_x = this.intersections[x_index];
                    world_y = this.intersections[x_index + 1];
                    world_x = this.optimize_intersection(this.functions[this.selected_item], this.functions[this.last_selected_item], world_x - selected_function.dx, world_x + selected_function.dx, 128);
                    world_y = selected_function.call(world_x);
                    this.intersections[x_index] = world_x;
                    this.intersections[x_index + 1] = world_y;
                }
                if (x_index !== null) {
                    this.render_x_y_label_world_space(ctx, world_x, world_y, 2, -1 * +ctx.font.split("px")[0]);
                    const sx = (world_x - this.x_min) / this.deltaX * this.main_buf.width;
                    ctx.beginPath();
                    const y = ((-world_y - this.y_min) / this.deltaY) * this.height;
                    ctx.moveTo(screen_space_y_axis, y);
                    ctx.lineTo(sx, y);
                    ctx.moveTo(sx, screen_space_x_axis);
                    ctx.lineTo(sx, y);
                    ctx.stroke();
                }
            }
        }
    }
    render_labels_min(ctx) {
        if (this.draw_point_labels) {
            const touchPos = this.touchListener.touchPos;
            const screen_space_x_axis = -this.y_min >= 0 && -this.y_max <= 0 ? (0 - this.y_min) / this.deltaY * this.cell_dim[1] : -this.y_min < 0 ? 0 : this.main_buf.height;
            let screen_space_y_axis = -this.x_min >= 0 && -this.x_max <= 0 ? (0 - this.x_min) / this.deltaX * this.cell_dim[0] : -this.x_min < 0 ? 0 : this.main_buf.width;
            let world_y = 0;
            let world_x = 0;
            const selected_function = this.functions[this.layer_manager.list.selected()];
            if (selected_function && this.layer_manager.list.selectedItem()?.checkBox.checked) {
                const touch_world_x = selected_function.x_min + touchPos[0] / this.main_buf.width * this.deltaX;
                const closest_min = selected_function.closest_min(touch_world_x);
                let x_index = closest_min;
                if (closest_min !== null) {
                    world_x = selected_function.local_minima[x_index];
                    world_y = selected_function.local_minima[x_index + 1];
                    world_x = selected_function.optimize_xmin(world_x - selected_function.dx, world_x + selected_function.dx, 128);
                    world_y = selected_function.compiled(world_x, selected_function.dx);
                    selected_function.local_minima[x_index] = world_x;
                    selected_function.local_minima[x_index + 1] = world_y;
                }
                if (x_index !== null) {
                    this.render_x_y_label_world_space(ctx, world_x, world_y, 2, +ctx.font.split("px")[0]);
                    const sx = (world_x - this.x_min) / this.deltaX * this.main_buf.width;
                    ctx.beginPath();
                    const y = ((-world_y - this.y_min) / this.deltaY) * this.height;
                    ctx.moveTo(screen_space_y_axis, y);
                    ctx.lineTo(sx, y);
                    ctx.moveTo(sx, screen_space_x_axis);
                    ctx.lineTo(sx, y);
                    ctx.stroke();
                }
            }
        }
    }
    world_x_to_screen(x) {
        return (x - this.x_min) / this.deltaX * this.main_buf.width;
    }
    world_y_to_screen(y) {
        return (-y - this.y_min) / this.deltaY * this.main_buf.height;
    }
    auto_round_world_x(x) {
        const logarithm = Math.log10(Math.abs(x));
        const rounded = Math.round(x * (Math.pow(1, -logarithm) * 100)) * Math.floor(Math.pow(1, logarithm)) / 100;
        return rounded;
    }
    round(value, places) {
        return +("" + Math.round(value * Math.pow(10, places)) * Math.pow(10, -places)).substring(0, places + 1);
    }
    render_x_y_label_screen_space(ctx, touchPos, precision = 2) {
        const world_x = ((touchPos[0] / this.width) * this.deltaX + this.x_min);
        const world_y = ((touchPos[1] / this.height) * this.deltaY + this.y_min);
        this.render_formatted_point(ctx, world_x, -world_y, touchPos[0], touchPos[1], precision);
    }
    render_x_y_label_world_space(ctx, world_x, world_y, precision = 1, offset_y = 0) {
        const screen_x = ((world_x - this.x_min) / this.deltaX) * this.width;
        const screen_y = clamp(((-world_y - this.y_min) / this.deltaY) * this.height, 30, this.height);
        this.render_formatted_point(ctx, world_x, world_y, screen_x, screen_y, precision, offset_y);
    }
    render_formatted_point(ctx, world_x, world_y, screen_x, screen_y, precision = 2, offset_y = 0) {
        const dim = 10;
        ctx.fillRect(screen_x - dim / 2, screen_y - dim / 2, dim, dim);
        ctx.strokeRect(screen_x - dim / 2, screen_y - dim / 2, dim, dim);
        let text;
        const decimal = Math.abs(world_x) < 1 << 16 && Math.abs(world_x) > Math.pow(2, -20) || Math.abs(world_x) < Math.pow(2, -35);
        text = `x: ${decimal ? round_with_precision(world_x, precision + 2) : world_x.toExponential(precision)} y: ${decimal ? round_with_precision(world_y, precision + 2) : world_y.toExponential(precision)}`;
        const text_width = ctx.measureText(text).width;
        if (text_width + screen_x + dim > this.width) {
            screen_x -= text_width + dim * 2;
            screen_y += 3;
        }
        ctx.fillText(text, screen_x + dim, screen_y + dim / 2 + offset_y);
        ctx.strokeText(text, screen_x + dim, screen_y + dim / 2 + offset_y);
    }
    format_number(value, precision = 2) {
        const dim = 10;
        let text;
        if (Math.abs(value) < 1 << 16 && Math.abs(value) > 0.0001) {
            text = `${round_with_precision(value, precision + 2)}`;
        }
        else {
            text = `${value.toExponential(precision)}`;
        }
        return text;
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
        this.traverse_df(start, (index, color) => color_p, (index, color) => color == this.background_color.color);
    }
    traverse_df(start, apply, verifier) {
        const view = new Int32Array(this.main_buf.imageData.data.buffer);
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
        if (this.layer_manager.list.selected() !== this.selected_item) {
            this.last_selected_item = this.selected_item;
            this.selected_item = this.layer_manager.list.selected();
        }
        const ms_to_fade = 250;
        this.state_manager_grid.transition(delta_time);
        if (!this.touchListener.registeredTouch) {
            if (!this.multi_touchListener.registeredMultiTouchEvent) {
                if (this.touchListener.touchPos[0] < this.options_gui_manager.x + this.options_gui_manager.width())
                    this.ui_alpha += delta_time / ms_to_fade;
                else
                    this.ui_alpha -= delta_time / ms_to_fade;
                this.ui_alpha = clamp(this.ui_alpha, 0, 1);
            }
            else
                this.ui_alpha = 0;
        }
    }
}
;
const keyboardHandler = new KeyboardHandler();
async function main() {
    const canvas = document.getElementById("screen");
    const touchListener = new SingleTouchListener(canvas, true, true, false);
    canvas.onmousemove = (event) => {
    };
    const power_of_2_bounds = 300;
    canvas.addEventListener("wheel", (e) => {
        if (e.deltaY > 10000)
            return;
        const normalized_delta = (e.deltaY + 1) / getHeight();
        const multiplier = 100;
        const scaler = game.scale / 100;
        game.scale -= normalized_delta * multiplier * scaler;
        game.scale = clamp(game.scale, Math.pow(2, -power_of_2_bounds), Math.pow(2, power_of_2_bounds));
        game.repaint = true;
        e.preventDefault();
    });
    canvas.width = getWidth();
    canvas.height = getHeight();
    canvas.style.cursor = "pointer";
    let counter = 0;
    const touchScreen = isTouchSupported();
    const multi_touch_listener = new MultiTouchListener(canvas);
    multi_touch_listener.registerCallBack("pinchIn", () => true, (event) => {
        const normalized_delta = event.delta / Math.max(getHeight(), getWidth());
        const scaler = game.scale / 10;
        game.scale += scaler * Math.abs(normalized_delta) * 100;
        game.scale = clamp(game.scale, Math.pow(2, -power_of_2_bounds), Math.pow(2, power_of_2_bounds));
        game.repaint = true;
        event.preventDefault();
    });
    multi_touch_listener.registerCallBack("pinchOut", () => true, (event) => {
        const normalized_delta = event.delta / Math.max(getHeight(), getWidth());
        const scaler = game.scale / 10;
        game.scale -= scaler * Math.abs(normalized_delta) * 100;
        game.scale = clamp(game.scale, Math.pow(2, -power_of_2_bounds), Math.pow(2, power_of_2_bounds));
        game.repaint = true;
        event.preventDefault();
    });
    let height = getHeight();
    let width = getWidth();
    let game = new Game(multi_touch_listener, touchListener, 0, 0, height, width);
    window.game = game;
    let low_fps = true;
    let draw = false;
    touchListener.registerCallBack("touchstart", (event) => game.ui_alpha >= 0.99, (event) => {
        game.guiManager.handleTouchEvents("touchstart", event);
        game.options_gui_manager.handleTouchEvents("touchstart", event);
    });
    touchListener.registerCallBack("touchend", (event) => game.ui_alpha >= 0.99, (event) => {
        game.guiManager.handleTouchEvents("touchend", event);
        game.options_gui_manager.handleTouchEvents("touchend", event);
    });
    touchListener.registerCallBack("touchmove", (event) => true, (event) => {
        let scaler_x = game.deltaX / (game.width);
        let scaler_y = game.deltaY / (game.height);
        game.y_translation -= game.scaling_multiplier * scaler_y * (event.deltaY);
        game.x_translation -= game.scaling_multiplier * scaler_x * (event.deltaX);
        if (game.ui_alpha >= 0.99) {
            game.guiManager.handleTouchEvents("touchmove", event);
            game.options_gui_manager.handleTouchEvents("touchmove", event);
        }
        game.repaint = true;
    });
    keyboardHandler.registerCallBack("keyup", () => true, (event) => {
        game.guiManager.handleKeyBoardEvents("keyup", event);
        game.options_gui_manager.handleKeyBoardEvents("keyup", event);
    });
    keyboardHandler.registerCallBack("keydown", () => true, (event) => {
        if (!keyboardHandler.keysHeld["MetaLeft"] && !keyboardHandler.keysHeld["ControlLeft"] &&
            !keyboardHandler.keysHeld["MetaRight"] && !keyboardHandler.keysHeld["ControlRight"])
            event.preventDefault();
        game.guiManager.handleKeyBoardEvents("keydown", event);
        game.options_gui_manager.handleKeyBoardEvents("keydown", event);
        game.repaint = true;
        let scaler_x = game.deltaX / (game.width);
        let scaler_y = game.deltaY / (game.height);
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
            canvas.width = width;
            canvas.height = height;
            game.init(width, height - 50, width, height - 50);
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
}
main();
