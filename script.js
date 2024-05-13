// Global constants and variables
const focal_length = 40;
let isRunning = false;
let rotationSpeedX = 0.05;
let rotationSpeedY = 0.05;
let rotationSpeedZ = 0.05;

// Inputs and buttons
const startButton = document.getElementById("start");
const stopButton = document.getElementById("stop");
const resetButton = document.getElementById("reset");
const torusX = document.getElementById("angleX");
const torusY = document.getElementById("angleY");
const torusZ = document.getElementById("angleZ");
const statusLabel = document.getElementById("status");

// Canvas set up
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// Get the device pixel ratio, falling back to 1.
const dpr = window.devicePixelRatio || 1;

// Get the size of the canvas in CSS pixels.
const canvas_rect = canvas.getBoundingClientRect();

// Give the canvas pixel dimensions of their CSS
// size * the device pixel ratio.
canvas.width = canvas_rect.width * dpr;
canvas.height = canvas_rect.height * dpr;

// Scale all drawing operations by the dpr, so everything is drawn at the correct resolution.
ctx.scale(dpr, dpr);

// Now, set the canvas style width and height back to the CSS dimensions
canvas.style.width = canvas_rect.width + 'px';
canvas.style.height = canvas_rect.height + 'px';

ctx.strokeStyle = 'white';
ctx.fillStyle = 'white';

class Matrix {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.data = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
    }

    static fromArray(arr) {
        return new Matrix(arr.length, 1).map((e, i) => arr[i]);
    }

    static subtract(a, b) {
        if (a.rows !== b.rows || a.cols !== b.cols) {
            console.log('Columns and Rows of A must match Columns and Rows of B.');
            return;
        }

        let result = new Matrix(a.rows, a.cols);
        result.data = a.data.map((row, i) => row.map((_, j) => a.data[i][j] - b.data[i][j]));
        return result;
    }

    toArray() {
        let arr = [];
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                arr.push(this.data[i][j]);
            }
        }
        return arr;
    }

    randomize() {
        return this.map(e => Math.random() * 2 - 1);
    }

    add(n) {
        if (n instanceof Matrix) {
            if (this.rows !== n.rows || this.cols !== n.cols) {
                console.log('Columns and Rows of A must match Columns and Rows of B.');
                return;
            }
            let result = new Matrix(this.rows, this.cols);
            result.data = this.data.map((row, i) => row.map((_, j) => this.data[i][j] + n.data[i][j]));
            return result;
        }
    }

    static transpose(matrix) {
        return new Matrix(matrix.cols, matrix.rows)
            .map((_, i, j) => matrix.data[j][i]);
    }

    static multiply(a, b) {
        if (a.cols !== b.rows) {
            console.log('Columns of A must match rows of B.');
            return;
        }
    
        let result = new Matrix(a.rows, b.cols);
        for (let i = 0; i < result.rows; i++) {
            for (let j = 0; j < result.cols; j++) {
                let sum = 0;
                for (let k = 0; k < a.cols; k++) {
                    sum += a.data[i][k] * b.data[k][j];
                }
                result.data[i][j] = sum;
            }
        }
        return result;
    }    

    multiply(n) {
        if (n instanceof Matrix) {
            if (this.rows !== n.rows || this.cols !== n.cols) {
                console.log('Columns and Rows of A must match Columns and Rows of B.');
                return;
            }
            return this.map((e, i, j) => e * n.data[i][j]);
        }
        return this.map(e => e * n);
    }
}

class Point3D {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

class Torus {
    constructor(center, R, r) { 
        this.center = center;
        this.R = R;
        this.r = r;
        this.points = [];

        for (let i = 0; i < 2 * Math.PI; i += Math.PI / 100) {
            for (let j = 0; j < 2 * Math.PI; j += Math.PI / 100) {
                let x = ((R + r * Math.cos(j)) * Math.cos(i)) + center.x;
                let y = ((R + r * Math.cos(j)) * Math.sin(i)) + center.y;
                let z = (r * Math.sin(j)) + center.z;
                this.points.push(new Point3D(x, y, z));
            }
        }
    }

    rotate(angleX, angleY, angleZ) {
        // Rotation matrices
        let rotationX = new Matrix(3, 3);
        rotationX.data = [
            [1, 0, 0],
            [0, Math.cos(angleX), -Math.sin(angleX)],
            [0, Math.sin(angleX), Math.cos(angleX)]
        ];

        let rotationY = new Matrix(3, 3);
        rotationY.data = [
            [Math.cos(angleY), 0, Math.sin(angleY)],
            [0, 1, 0],
            [-Math.sin(angleY), 0, Math.cos(angleY)]
        ];

        let rotationZ = new Matrix(3, 3);
        rotationZ.data = [
            [Math.cos(angleZ), -Math.sin(angleZ), 0],
            [Math.sin(angleZ), Math.cos(angleZ), 0],
            [0, 0, 1]
        ];

        // Apply rotations around the center of the torus
        for (let i = 0; i < this.points.length; i++) {
            let point = this.points[i];

            // Translate point to origin
            let x = point.x - this.center.x;
            let y = point.y - this.center.y;
            let z = point.z - this.center.z;

            let pointMatrix = new Matrix(3, 1);
            pointMatrix.data = [[x], [y], [z]];

            // Apply rotations
            let rotatedPoint = Matrix.multiply(rotationX, pointMatrix);
            rotatedPoint = Matrix.multiply(rotationY, rotatedPoint);
            rotatedPoint = Matrix.multiply(rotationZ, rotatedPoint);

            // Translate back to original position
            this.points[i] = new Point3D(rotatedPoint.data[0][0] + this.center.x, 
                                          rotatedPoint.data[1][0] + this.center.y, 
                                          rotatedPoint.data[2][0] + this.center.z);
        }
    }

    draw(ctx) {
        for (let i = 0; i < this.points.length; i++) {
            let point = project(this.points[i]);
            ctx.fillRect(point.x, point.y, 2, 2);
        }
    }
}

class Cube {
    constructor(center, size) {
        this.center = center;
        this.size = size;
        this.points = [
            new Point3D(center.x - size / 2, center.y - size / 2, center.z - size / 2),
            new Point3D(center.x + size / 2, center.y - size / 2, center.z - size / 2),
            new Point3D(center.x + size / 2, center.y + size / 2, center.z - size / 2),
            new Point3D(center.x - size / 2, center.y + size / 2, center.z - size / 2),
            new Point3D(center.x - size / 2, center.y - size / 2, center.z + size / 2),
            new Point3D(center.x + size / 2, center.y - size / 2, center.z + size / 2),
            new Point3D(center.x + size / 2, center.y + size / 2, center.z + size / 2),
            new Point3D(center.x - size / 2, center.y + size / 2, center.z + size / 2)
        ];
    }

    rotate(angleX, angleY, angleZ) {
        // Rotation matrices
        let rotationX = new Matrix(3, 3);
        rotationX.data = [
            [1, 0, 0],
            [0, Math.cos(angleX), -Math.sin(angleX)],
            [0, Math.sin(angleX), Math.cos(angleX)]
        ];

        let rotationY = new Matrix(3, 3);
        rotationY.data = [
            [Math.cos(angleY), 0, Math.sin(angleY)],
            [0, 1, 0],
            [-Math.sin(angleY), 0, Math.cos(angleY)]
        ];

        let rotationZ = new Matrix(3, 3);
        rotationZ.data = [
            [Math.cos(angleZ), -Math.sin(angleZ), 0],
            [Math.sin(angleZ), Math.cos(angleZ), 0],
            [0, 0, 1]
        ];

        // Apply rotations around the center of the cube
        for (let i = 0; i < this.points.length; i++) {
            let point = this.points[i];

            // Translate point to origin
            let x = point.x - this.center.x;
            let y = point.y - this.center.y;
            let z = point.z - this.center.z;

            let pointMatrix = new Matrix(3, 1);
            pointMatrix.data = [[x], [y], [z]];

            // Apply rotations
            let rotatedPoint = Matrix.multiply(rotationX, pointMatrix);
            rotatedPoint = Matrix.multiply(rotationY, rotatedPoint);
            rotatedPoint = Matrix.multiply(rotationZ, rotatedPoint);

            // Translate back to original position
            this.points[i] = new Point3D(rotatedPoint.data[0][0] + this.center.x, 
                                          rotatedPoint.data[1][0] + this.center.y, 
                                          rotatedPoint.data[2][0] + this.center.z);
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(project(this.points[0]).x, project(this.points[0]).y);
        ctx.lineTo(project(this.points[1]).x, project(this.points[1]).y);
        ctx.lineTo(project(this.points[2]).x, project(this.points[2]).y);
        ctx.lineTo(project(this.points[3]).x, project(this.points[3]).y);
        ctx.lineTo(project(this.points[0]).x, project(this.points[0]).y);
        ctx.moveTo(project(this.points[4]).x, project(this.points[4]).y);
        ctx.lineTo(project(this.points[5]).x, project(this.points[5]).y);
        ctx.lineTo(project(this.points[6]).x, project(this.points[6]).y);
        ctx.lineTo(project(this.points[7]).x, project(this.points[7]).y);
        ctx.lineTo(project(this.points[4]).x, project(this.points[4]).y);
        ctx.moveTo(project(this.points[0]).x, project(this.points[0]).y);
        ctx.lineTo(project(this.points[4]).x, project(this.points[4]).y);
        ctx.moveTo(project(this.points[1]).x, project(this.points[1]).y);
        ctx.lineTo(project(this.points[5]).x, project(this.points[5]).y);
        ctx.moveTo(project(this.points[2]).x, project(this.points[2]).y);
        ctx.lineTo(project(this.points[6]).x, project(this.points[6]).y);
        ctx.moveTo(project(this.points[3]).x, project(this.points[3]).y);
        ctx.lineTo(project(this.points[7]).x, project(this.points[7]).y);
        ctx.stroke();
    }
}

class Cone {
    constructor(center, height, radius) {
        this.center = center;
        this.height = height;
        this.radius = radius;
        this.points = [];

        for (let i = 0; i < 2 * Math.PI; i += Math.PI / 100) {
            let x = radius * Math.cos(i) + center.x;
            let y = radius * Math.sin(i) + center.y;
            let z = center.z;
            this.points.push(new Point3D(x, y, z));
        }

        for (let i = 0; i < 2 * Math.PI; i += Math.PI / 100) {
            let x = center.x;
            let y = center.y;
            let z = center.z + height;
            this.points.push(new Point3D(x, y, z));
        }

        this.top_point = new Point3D(center.x, center.y, center.z + height);
    }

    rotate(angleX, angleY, angleZ) {
        // Rotation matrices
        let rotationX = new Matrix(3, 3);
        rotationX.data = [
            [1, 0, 0],
            [0, Math.cos(angleX), -Math.sin(angleX)],
            [0, Math.sin(angleX), Math.cos(angleX)]
        ];

        let rotationY = new Matrix(3, 3);
        rotationY.data = [
            [Math.cos(angleY), 0, Math.sin(angleY)],
            [0, 1, 0],
            [-Math.sin(angleY), 0, Math.cos(angleY)]
        ];

        let rotationZ = new Matrix(3, 3);
        rotationZ.data = [
            [Math.cos(angleZ), -Math.sin(angleZ), 0],
            [Math.sin(angleZ), Math.cos(angleZ), 0],
            [0, 0, 1]
        ];

        // Apply rotations around the center of the cone
        for (let i = 0; i < this.points.length; i++) {
            let point = this.points[i];

            // Translate point to origin
            let x = point.x - this.center.x;
            let y = point.y - this.center.y;
            let z = point.z - this.center.z;

            let pointMatrix = new Matrix(3, 1);
            pointMatrix.data = [[x], [y], [z]];

            // Apply rotations
            let rotatedPoint = Matrix.multiply(rotationX, pointMatrix);
            rotatedPoint = Matrix.multiply(rotationY, rotatedPoint);
            rotatedPoint = Matrix.multiply(rotationZ, rotatedPoint);

            // Translate back to original position
            this.points[i] = new Point3D(rotatedPoint.data[0][0] + this.center.x, 
                                          rotatedPoint.data[1][0] + this.center.y, 
                                          rotatedPoint.data[2][0] + this.center.z);
        }
    }

    draw(ctx) {
        const projected_top_point = project(this.top_point);
        const projected_points = this.points.map(point => project(point));
        // Draw the base of the cone
        projected_points.forEach((point, i) => {
            ctx.fillRect(point.x, point.y, 2, 2);
        });

        // Draw the sides of the cone
        for (let i = 0; i < projected_points.length; i++) {
            ctx.beginPath();
            ctx.moveTo(projected_points[i].x, projected_points[i].y);
            ctx.lineTo(projected_top_point.x, projected_top_point.y);
            ctx.stroke();
        }
    }
}

function project(point3d) {
    let x = canvas_rect.width / 2 + point3d.x * (focal_length / point3d.z);
    let y = canvas_rect.height / 2 + point3d.y * (focal_length / point3d.z);
    return new Point3D(x, y, point3d.z);    
}

let torus = new Torus(new Point3D(0, 0, -50), 30, 10);

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    torus.draw(ctx);
}

const update = () => {
    if (!isRunning) {
        return;
    }

    torus.rotate(rotationSpeedX, rotationSpeedY, rotationSpeedZ);
    draw();
    
    setTimeout(() => {
        requestAnimationFrame(update);
    }, 1000 / 60);
}

startButton.addEventListener("click", () => {
    // Update values
    rotationSpeedX = parseFloat(torusX.value);
    rotationSpeedY = parseFloat(torusY.value);
    rotationSpeedZ = parseFloat(torusZ.value);

    isRunning = true;
    statusLabel.innerText = "Status: Running";
    update();
});

stopButton.addEventListener("click", () => {
    isRunning = false;
    statusLabel.innerText = "Status: Stopped";
});

resetButton.addEventListener("click", () => {
    torus = new Torus(new Point3D(0, 0, -50), 30, 10);

    torusX.value = 0.05;
    torusY.value = 0.05;
    torusZ.value = 0.05;

    isRunning = false;
    statusLabel.innerText = "Status: Stopped";

    draw();
});

