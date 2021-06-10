import { scale } from "./utilities";

class MouseReader {
  constructor(element, toolbar, messenger) {
    this.element = element;
    this.toolbar = toolbar;
    this.messenger = messenger;

    this.minX = -10;
    this.maxX = 10;
    this.minY = -10;
    this.maxY = 10;

    this.currentXRange = [-10, 10];
    this.currentYRange = [-10, 10];

    this._boxSelectMarker = document.getElementById("box-select");
    this._currentSelectionPoints = [];
  }

  init() {
    this.width = this.element.getBoundingClientRect().width;
    this.height = this.element.getBoundingClientRect().height;
    // this.width, this.height
    this.element.addEventListener("wheel", this._onWheel.bind(this), false);

    let mouseDown = false;
    this.element.addEventListener(
      "mousedown",
      (event) => {
        mouseDown = true;
        switch (this.toolbar.mouseAction) {
          case "pan":
            break;
          case "box":
            this._currentSelectionPoints = this._calculateViewportSpot(
              event.layerX,
              event.layerY
            );
            break;
          case "lasso":
            break;
        }
      },
      false
    );

    this.element.addEventListener(
      "mousemove",
      (event) => {
        if (!mouseDown) {
          return;
        }
        switch (this.toolbar.mouseAction) {
          case "pan":
            this._onPan(event);
            this._updateBoxSelectView();
            break;
          case "box":
            this._currentSelectionPoints = this._currentSelectionPoints
              .slice(0, 2)
              .concat(this._calculateViewportSpot(event.layerX, event.layerY));
            this._updateBoxSelectView();
            break;
          case "lasso":
            break;
        }
      },
      false
    );

    this.element.addEventListener("mouseup", (event) => {
      mouseDown = false;
      switch (this.toolbar.mouseAction) {
        case "pan":
          break;
        case "box":
          if (this._currentSelectionPoints.length !== 4) {
            this._currentSelectionPoints = [];
            this._updateBoxSelectView();
          }
          this._onBoxSelect(event);
          break;
        case "lasso":
          break;
      }
    });

    this.element.addEventListener("mouseleave", () => {
      switch (this.toolbar.mouseAction) {
        case "pan":
          this._isPanning = false;
          break;
        case "box":
          break;
        case "lasso":
          break;
      }
    });
  }

  _onWheel(event) {
    event.preventDefault();
    if (!this.toolbar.lockedX) {
      const previousX = [...this.currentXRange]; // ... to avoid aliasing
      this.currentXRange[0] -= event.wheelDelta / 500;
      this.currentXRange[1] += event.wheelDelta / 500;
      this.currentXRange[0] = Math.max(this.currentXRange[0], this.minX);
      this.currentXRange[1] = Math.min(this.currentXRange[1], this.maxX);

      if (this.currentXRange[1] < this.currentXRange[0]) {
        // Zoom in limit
        this.currentXRange = previousX;
      }
    }

    if (!this.toolbar.lockedY) {
      const previousY = [...this.currentYRange];
      this.currentYRange[0] -= event.wheelDelta / 500;
      this.currentYRange[1] += event.wheelDelta / 500;
      this.currentYRange[0] = Math.max(this.currentYRange[0], this.minY);
      this.currentYRange[1] = Math.min(this.currentYRange[1], this.maxY);

      if (this.currentYRange[1] < this.currentYRange[0]) {
        // Zoom in limit
        this.currentYRange = previousY;
      }
    }

    this.toolbar.updateSelectionWindowDisplay(
      this.currentXRange,
      this.currentYRange
    );
    this.messenger();
    this._updateBoxSelectView();
    return false;
  }

  _onPan(event) {
    if (!this.toolbar.lockedX) {
      const previousX = [...this.currentXRange]; // ... to avoid aliasing
      this.currentXRange[0] -= event.movementX / 50;
      this.currentXRange[1] -= event.movementX / 50;
      this.currentXRange[0] = Math.max(this.currentXRange[0], this.minX);
      this.currentXRange[1] = Math.min(this.currentXRange[1], this.maxX);

      if (this.currentXRange[1] < this.currentXRange[0]) {
        this.currentXRange = previousX;
      }
    }

    if (!this.toolbar.lockedY) {
      const previousY = [...this.currentYRange];
      this.currentYRange[0] += event.movementY / 50;
      this.currentYRange[1] += event.movementY / 50;
      this.currentYRange[0] = Math.max(this.currentYRange[0], this.minY);
      this.currentYRange[1] = Math.min(this.currentYRange[1], this.maxY);

      if (this.currentYRange[1] < this.currentYRange[0]) {
        this.currentYRange = previousY;
      }
    }

    this.messenger();
    this.toolbar.updateSelectionWindowDisplay(
      this.currentXRange,
      this.currentYRange
    );
  }

  _updateBoxSelectView() {
    if (this._currentSelectionPoints.length !== 4) {
      // Clicked away selection box
      this._boxSelectMarker.style.left = "-100px";
      this._boxSelectMarker.style.top = "-100px";

      this._boxSelectMarker.style.width = "0";
      this._boxSelectMarker.style.height = "0";
    }

    const boundingRect = this.element.getBoundingClientRect();
    const canvasTopLeft = this._calculateViewportSpotInverse(
      this._currentSelectionPoints[0],
      this._currentSelectionPoints[1]
    );
    const canvasBottomRight = this._calculateViewportSpotInverse(
      this._currentSelectionPoints[2],
      this._currentSelectionPoints[3]
    );

    const width = canvasBottomRight[0] - canvasTopLeft[0];
    const height = canvasBottomRight[1] - canvasTopLeft[1];

    // Check if user drags from bottom right to top left
    if (width < 0) {
      this._boxSelectMarker.style.left = `${
        boundingRect.left + canvasTopLeft[0] + width
      }px`;
    } else {
      this._boxSelectMarker.style.left = `${
        boundingRect.left + canvasTopLeft[0]
      }px`;
    }

    if (height < 0) {
      this._boxSelectMarker.style.top = `${
        boundingRect.top + canvasTopLeft[1] + height
      }px`;
    } else {
      this._boxSelectMarker.style.top = `${
        boundingRect.top + canvasTopLeft[1]
      }px`;
    }

    this._boxSelectMarker.style.width = `${Math.abs(width)}px`;
    this._boxSelectMarker.style.height = `${Math.abs(height)}px`;
  }

  _onBoxSelect(event) {
    console.log(event);
  }

  _calculateViewportSpot(canvasX, canvasY) {
    const scaleX = scale([0, this.width], this.currentXRange);
    // Flipped for Y since canvas using typical graphics coordinates but GPU clipspace is typical cartesian coordinates
    const scaleY = scale([this.height, 0], this.currentYRange);
    return [scaleX(canvasX), scaleY(canvasY)];
  }

  _calculateViewportSpotInverse(viewportX, viewportY) {
    const inverseScaleX = scale(this.currentXRange, [0, this.width]);
    // Flipped for Y since canvas using typical graphics coordinates but GPU clipspace is typical cartesian coordinates
    const inverseScaleY = scale(this.currentYRange, [this.height, 0]);

    return [inverseScaleX(viewportX), inverseScaleY(viewportY)];
  }

  getViewport() {
    return {
      minX: this.minX,
      maxX: this.maxX,
      minY: this.minY,
      maxY: this.maxY,
      currentXRange: this.currentXRange,
      currentYRange: this.currentYRange,
    };
  }
}

export default MouseReader;
