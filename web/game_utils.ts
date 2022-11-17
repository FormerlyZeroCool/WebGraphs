
import { getHeight, getWidth, GuiElement } from './gui.js'
import {isTouchSupported} from './io.js'

export function menu_font_size():number { return (isTouchSupported() ? 27:22) * (Math.min(getWidth(), getHeight()) < 600 ? 0.75 : 1); }
export function distance(a:SquareAABBCollidable, b:SquareAABBCollidable):number
{
    const dx = a.mid_x() - b.mid_x();
    const dy = a.mid_y() - b.mid_y();
    return Math.sqrt(dx*dx + dy*dy);
}
export function get_normal_vector_aabb_rect_circle_collision(ball:SpatiallyMappableCircle, brick:SquareAABBCollidable):number[]
{

    let delta:number[] = [0, 0];
    const collision_code = brick.collides_with_circle(ball);
    if(collision_code === 1)
    {
        const point_collision:number[] = [-1, -1];
        if(ball.mid_x() < brick.mid_x())//left side
        {
            if(ball.mid_y() > brick.mid_y())//top left
            {
                delta = [brick.x - ball.mid_x(), brick.y - ball.mid_y()];
                point_collision[0] = brick.x;
                point_collision[1] = brick.y;
            }  
            else//bottom left
            {
                delta = [brick.x - ball.mid_x(), brick.y + brick.height - ball.mid_y()];
                point_collision[0] = brick.x;
                point_collision[1] = brick.y + brick.height;
            }
            
        }
        else
        {
            if(ball.mid_y() > brick.mid_y())//top right
            {
                delta = [brick.x + brick.width - ball.mid_x(), -brick.y + ball.mid_y()];
                point_collision[0] = brick.x + brick.width;
                point_collision[1] = brick.y;

            }  
            else//bottom right
            {
                delta = [-brick.x - brick.width + ball.mid_x(), -brick.y - brick.height + ball.mid_y()];
                point_collision[0] = brick.x + brick.width;
                point_collision[1] = brick.y + brick.height;
            }
        }
        //invert vector to be normal vector for corner
        const dist_plus:number = magnitude((delta[0] + point_collision[0] - brick.mid_x()),
        (delta[1] + point_collision[1] - brick.mid_y()));
        const dist_minus:number = magnitude((-delta[0] + point_collision[0] - brick.mid_x()),
            (-delta[1] + point_collision[1] - brick.mid_y()));
        if(dist_minus > dist_plus)
        {
            delta[0] *= -1;
            delta[1] *= -1;
        }
    }
    else 
    {
        if(ball.mid_y() < brick.y)
        {
            delta = [0, -ball.radius];
        }
        else if(ball.mid_y() > brick.y + brick.height)
        {
            delta = [0, ball.radius];
        }
        else if(ball.mid_x() < brick.x)
        {
            delta = [-ball.radius, 0];
        }
        else
        {
            delta = [ball.radius, 0];
        }
    }
    return delta;
}
export function non_elastic_no_angular_momentum_bounce_vector(direction_vector:number[], normal_vector:number[]):number[]
{
    const mag = magnitude(direction_vector[0], direction_vector[1]);
    const collision_vector = normalize2D(normal_vector);
    const ndirection = normalize2D(direction_vector);
    const u = scalar_product_2d(dot_product_2d(ndirection, collision_vector), collision_vector);
    const w = [ndirection[0] - u[0], ndirection[1] - u[1]];

    return [(w[0] - u[0]) * mag, (w[1] - u[1]) * mag];
}
export function normalize2D(vector:number[]):number[]
{
    const mag = magnitude(vector[0], vector[1]);
    return [vector[0] / mag, vector[1] / mag];
}
export function magnitude(a:number, b:number):number
{
    return Math.sqrt(a*a + b*b);
}
export function scalar_product_2d(a:number, b:number[]):number[]
{
    return [a * b[0], a * b[1]];
}
export function dot_product_2d(a:number[], b:number[]):number
{
    return a[0]*b[0] + a[1]*b[1];
}
export function manhattan_distance(a:SquareAABBCollidable, b:SquareAABBCollidable):number
{
    const dx = Math.abs(a.mid_x() - b.mid_x());
    const dy = Math.abs(a.mid_y() - b.mid_y());
    return dx + dy;
}
export interface GameObject {
    direction:number[];
    draw(canvas:HTMLCanvasElement, ctx:CanvasRenderingContext2D, x:number, y:number, width:number, height:number):void;
    update_state(delta_time:number):void;
};
export interface Attackable {
    dim():number[];
    attack(enemy:Attackable):void;
    offense():number;
    defense():number; //0 - 1 //1 is 100% // 0 is 0%
    lose_hp(hp:number, enemy:Attackable):void;
};
export interface SpatialObject {
    get_normalized_direction_vector(other:SpatialObject):number[];
    dim():number[];
    mid_x():number;
    mid_y():number;
};
export interface Collidable extends SpatialObject {
    x:number;
    y:number;
    check_collision(other:SquareAABBCollidable):boolean;
    max_width():number;
    max_height():number;
    get_normalized_direction_vector(other:SpatialObject):number[];
    dim():number[];
    mid_x():number;
    mid_y():number;
};
export interface Circle {
    radius:number;
    mid_x():number;
    mid_y():number;
};
export class SquareAABBCollidable implements Collidable, GameObject {
    x:number;
    y:number;
    width:number;
    height:number;
    direction:number[];
    accel:number[];

    constructor(x:number, y:number, width:number, height:number, vel_x:number = 0, vel_y:number = 0, accel_x:number = 0, accel_y = 0)
    {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.direction = [vel_x, vel_y];
        this.accel = [accel_x, accel_y];
    }
    collides_with_circle(circle:Circle):number
    {
        const dx = Math.abs(circle.mid_x() - this.mid_x());
        const dy = Math.abs(circle.mid_y() - this.mid_y());

        if (dx > (this.width/2 + circle.radius)) { return 0; }
        if(dy > (this.height/2 + circle.radius)) { return 0; }

        if (dx <= (this.width/2) || dy <= (this.height/2)) { return 2; }

        const cornerDistance_sq = (dx - this.width/2) * (dx - this.width/2) +
            (dy - this.height/2) * (dy - this.height/2);

        return +(cornerDistance_sq <= (circle.radius * circle.radius));
    }
    draw(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
        throw new Error('Method not implemented.');
    }
    update_state(delta_time: number): void {
        this.x += this.direction[0] * delta_time * 1/1000;
        this.y += this.direction[1] * delta_time * 1/1000;
        this.direction[0] += this.accel[0] * delta_time * 1/1000;
        this.direction[1] += this.accel[1] * delta_time * 1/1000;
    }
    max_width():number { return this.width; }
    max_height():number {return this.height; }
    check_collision(other:SquareAABBCollidable):boolean
    {
        return this.x < other.x + other.width && other.x < this.x + this.width && 
            this.y < other.y + other.height && other.y < this.y + this.height;
    }
    check_collision_gui(other:GuiElement, x:number, y:number):boolean
    {
        return this.x < x + other.width() && x < this.x + this.width && 
            this.y < y + other.height() && y < this.y + this.height;
    }
    get_normalized_direction_vector(other:SpatialObject):number[]
    {
        const dy:number = -this.mid_y() + other.mid_y();
        const dx:number = -this.mid_x() + other.mid_x();
        const dist = Math.sqrt(dy*dy + dx*dx);
        const norm_dy = dy / dist;
        const norm_dx = dx / dist;
        return [dx / dist, dy / dist];
    }
    dim():number[]
    {
        return [this.x, this.y, this.width, this.height];
    }
    mid_x():number
    {
        return this.x + this.width / 2;
    }
    mid_y():number
    {
        return this.y + this.height / 2;
    }
};
export class SpatiallyMappableCircle extends SquareAABBCollidable implements Circle {
    radius:number;
    snap_back_out_of_squareAABBColidable(brick:SquareAABBCollidable, collision_code:number, delta_time:number):void
    {
        //no collision
        //1 corner collision
        //2 edge collision
        this.direction[0] *= -1;
        this.direction[1] *= -1;
        this.update_state(delta_time);
        this.direction[0] *= -1;
        this.direction[1] *= -1;

        //if dist between this center, and rect center 
        //is greater than Max(brick.width/2, brick.height/2) + this.radius
        //take diff between dist above, and Max(brick.width/2, brick.height/2) + this.radius
        //move this by multiplying that diff by the components of dir, and translating this by result
        const dist = distance(this, brick);
        const max_dist = Math.max(brick.width / 2, brick.height / 2) + this.radius;
        if(dist > max_dist)
        {
            const delta_mag:number = this.mid_y() > brick.mid_y()?-max_dist + dist:max_dist - dist;
            const norm_dir = normalize2D(this.direction);
            this.x += norm_dir[0] * delta_mag;
            this.y += norm_dir[1] * delta_mag;
        }
        else if(dist < max_dist && collision_code === 1)
        {
            const delta_mag:number = this.mid_y() > brick.mid_y()?-max_dist + dist:max_dist - dist;
            const norm_dir = normalize2D(this.direction);
            this.x += norm_dir[0] * delta_mag;
            this.y += norm_dir[1] * delta_mag;
        }

    }
};
export class Cell {
    collidable_objects:SquareAABBCollidable[];
    collidable_not_with_self:SquareAABBCollidable[];
    collidable_not_with_self2:SquareAABBCollidable[];
    constructor()
    {
        this.collidable_objects = [];
        this.collidable_not_with_self = [];
        this.collidable_not_with_self2 = [];
    }
    push_collidable(object:SquareAABBCollidable):void
    {
        this.collidable_objects.push(object);
    }
    push_collidable_not_with_self(object:SquareAABBCollidable):void
    {//will only collide with regular collidable objects not with themselves
        this.collidable_not_with_self.push(object);
    }
};
export class SpatialHashMap2D {
    data:Cell[];
    screen_width:number;
    screen_height:number;
    cells_vertical:number;
    cells_horizontal:number;
    constructor(collidables:SquareAABBCollidable[], collidable_not_with_self:SquareAABBCollidable[], collidable_not_with_self2:SquareAABBCollidable[],
        screen_width:number, screen_height:number, cells_vertical:number, cells_horizontal:number)
    {
        this.data = [];
        screen_width = screen_width;
        screen_height = screen_height;
        cells_horizontal = cells_horizontal;
        cells_vertical = cells_vertical;
        for(let i = 0; i < cells_vertical * cells_horizontal; i++)
        {
            this.data.push(new Cell());
        }
        for(let i = 0; i < collidable_not_with_self.length; i++)
        {
            const collidable = collidable_not_with_self[i];
            const dx = Math.ceil(collidable.max_width() / screen_width * cells_horizontal);
            const dy = Math.ceil(collidable.max_height() / screen_height * cells_vertical);
            {
                const grid_x = Math.floor((collidable.x) / screen_width * cells_horizontal);
                const grid_y = Math.floor((collidable.y) / screen_height * cells_vertical);

                for(let y = 0; y <= dy; y++)
                {
                    for(let x = 0; x <= dx && x + grid_x < cells_horizontal; x++)
                    {
                        const cell = this.data[grid_x + x + (grid_y + y) * cells_horizontal];
                        if(cell)
                            cell.push_collidable_not_with_self(collidable);
                    }
                }
            }
        }
        for(let i = 0; i < collidable_not_with_self2.length; i++)
        {
            const collidable = collidable_not_with_self2[i];
            const dx = Math.ceil(collidable.max_width() / screen_width * cells_horizontal);
            const dy = Math.ceil(collidable.max_height() / screen_height * cells_vertical);
            {
                const grid_x = Math.floor((collidable.x) / screen_width * cells_horizontal);
                const grid_y = Math.floor((collidable.y) / screen_height * cells_vertical);

                for(let y = 0; y <= dy; y++)
                {
                    for(let x = 0; x <= dx && x + grid_x < cells_horizontal; x++)
                    {
                        const cell = this.data[grid_x + x + (grid_y + y) * cells_horizontal];
                        if(cell)
                            cell.collidable_not_with_self2.push(collidable);
                    }
                }
            }
        }
        for(let i = 0; i < collidables.length; i++)
        {
            const collidable = collidables[i];
            const dx = Math.ceil(collidable.max_width() / screen_width * cells_horizontal);
            const dy = Math.ceil(collidable.max_height() / screen_height * cells_vertical);
            {
                const grid_x = Math.floor((collidable.x) / screen_width * cells_horizontal);
                const grid_y = Math.floor((collidable.y) / screen_height * cells_vertical);

                for(let y = 0; y <= dy; y++)
                {
                    for(let x = 0; x <= dx; x++)
                    {
                        const cell = this.data[grid_x + x + (grid_y + y) * cells_horizontal];
                        if(cell)
                            cell.push_collidable(collidable);
                    }
                }
            }
        }
    }
    push_collidable(collidable:SquareAABBCollidable):void
    {
        const grid_x = Math.floor((collidable.x) / this.screen_width * this.cells_horizontal);
        const grid_y = Math.floor((collidable.y) / this.screen_height * this.cells_vertical);
        this.data[grid_x + grid_y * this.cells_horizontal].push_collidable(collidable);
    }
    push_collidable_not_with_self(collidable:SquareAABBCollidable):void
    {
        const grid_x = Math.floor((collidable.x) / this.screen_width * this.cells_horizontal);
        const grid_y = Math.floor((collidable.y) / this.screen_height * this.cells_vertical);
        this.data[grid_x + grid_y * this.cells_horizontal].push_collidable_not_with_self(collidable);
    }
    remove_collidable(collidable:SquareAABBCollidable):void
    {
        const grid_x = Math.floor((collidable.x) / this.screen_width * this.cells_horizontal);
        const grid_y = Math.floor((collidable.y) / this.screen_height * this.cells_vertical);
        const cell = this.data[grid_x + grid_y * this.cells_horizontal].collidable_objects;
        cell.splice(cell.indexOf(collidable), 1);
    }
    remove_collidable_not_with_self(collidable:SquareAABBCollidable):void
    {
        const grid_x = Math.floor((collidable.x) / this.screen_width * this.cells_horizontal);
        const grid_y = Math.floor((collidable.y) / this.screen_height * this.cells_vertical);
        const cell = this.data[grid_x + grid_y * this.cells_horizontal].collidable_not_with_self;
        cell.splice(cell.indexOf(collidable), 1);
    }
    handle_by_cell(callback:(a:SquareAABBCollidable, b:SquareAABBCollidable) => void,
        callback_rhs_collidable_not_with_self:(a:SquareAABBCollidable, b:SquareAABBCollidable) => void,
        callback_rhs_collidable_not_with_self2:(a:SquareAABBCollidable, b:SquareAABBCollidable) => void,
        callback_lhs_collidable_not_with_self1_rhs_collidable_not_with_self2:(a:SquareAABBCollidable, b:SquareAABBCollidable) => void):void
    {
        for(let i = 0; i < this.data.length; i++)
        {
            this.handle_cell(i, callback, callback_rhs_collidable_not_with_self, callback_rhs_collidable_not_with_self2, 
                callback_lhs_collidable_not_with_self1_rhs_collidable_not_with_self2);
        }
    }
    handle_cell(index:number, callback:(a:SquareAABBCollidable, b:SquareAABBCollidable) => void, 
        callback_rhs_collidable_not_with_self:(a:SquareAABBCollidable, b:SquareAABBCollidable) => void,
        callback_rhs_collidable_not_with_self2:(a:SquareAABBCollidable, b:SquareAABBCollidable) => void,
        callback_lhs_collidable_not_with_self1_rhs_collidable_not_with_self2:(a:SquareAABBCollidable, b:SquareAABBCollidable) => void):void
    {
        const cell = this.data[index];
        const collidables = cell.collidable_objects;
        const collidables_not_with_self = cell.collidable_not_with_self;
        const collidables_not_with_self2 = cell.collidable_not_with_self2;
        for(let i = 0; i < collidables.length; i++)
        {
            const collidable = collidables[i];
            for(let j = 0; j < collidables_not_with_self.length; j++)
            {
                const collidable2 = collidables_not_with_self[j];
                if(collidable2.check_collision(collidable))
                {
                    callback_rhs_collidable_not_with_self(collidable, collidable2);
                }
            }
            for(let j = 0; j < collidables_not_with_self2.length; j++)
            {
                const collidable2 = collidables_not_with_self2[j];
                if(collidable2.check_collision(collidable))
                {
                    callback_rhs_collidable_not_with_self2(collidable, collidable2);
                }
            }
            for(let j = 0; j < collidables.length; j++)
            {
                const collidable2 = collidables[j];
                if(collidable2.check_collision(collidable))
                {
                   callback(collidable, collidable2);
                }
            }
        }

        for(let i = 0; i < collidables_not_with_self.length; i++)
        {
            for(let j = 0; j < collidables_not_with_self2.length; j++)
            {
                const collidable = collidables_not_with_self[i];
                const collidable2 = collidables_not_with_self2[j];
                if(collidable2.check_collision(collidable))
                {
                    callback_lhs_collidable_not_with_self1_rhs_collidable_not_with_self2(collidable, collidable2);
                }
            }
        }
        
    }
    draw_objects(canvas:HTMLCanvasElement, ctx:CanvasRenderingContext2D):void
    {
        for(let i = 0; i < this.data.length; i++)
        {
            const cell = this.data[i];
            for(let j = 0; j < cell.collidable_not_with_self.length; j++)
            {
                const drawable = cell.collidable_not_with_self[i];
                drawable.draw(canvas, ctx, drawable.x, drawable.y, drawable.width, drawable.height);
            }
            for(let j = 0; j < cell.collidable_objects.length; j++)
            {
                const drawable = cell.collidable_objects[i];
                drawable.draw(canvas, ctx, drawable.x, drawable.y, drawable.width, drawable.height);
            }
        }
    }
};