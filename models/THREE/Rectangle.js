
/**
 * Math 
 */

define(function(require) {

  var helper = require('./LinesHelper')

  /**
   * наличие пересечения линий в плоскости XZ
   */
  function isCrossLines(v1, v2, v3, v4, VX = 'x', VY = 'y') {
    
    var v13 = v1.clone().sub(v3)
    var v21 = v2.clone().sub(v1)
    var v23 = v2.clone().sub(v3)
    var v31 = v3.clone().sub(v1)
    var v41 = v4.clone().sub(v1)
    var v43 = v4.clone().sub(v3)

    var ccw = (v1, v2) => v1[VX] * v2[VY] - v1[VY] * v2[VX]

    return ( (ccw(v21, v31) <= 0) ^ (ccw(v21, v41) <= 0) ) &&
           ( (ccw(v43, v23) <= 0) ^ (ccw(v43, v13) <= 0) )

  }
  
  /**
   * расчитывает точку пересечения 2ух прямых (не отрезков)
   */
  function linesCrossPoint(v1, v2, v3, v4, VX = 'x', VY = 'y') {

    var K1 = (v2[VY] - v1[VY])/(v2[VX] - v1[VX])
    var K2 = (v4[VY] - v3[VY])/(v4[VX] - v3[VX])

    var B1 = (v2[VX]*v1[VY] - v1[VX]*v2[VY])/(v2[VX] - v1[VX])
    var B2 = (v4[VX]*v3[VY] - v3[VX]*v4[VY])/(v4[VX] - v3[VX])

    var x, y
    if(v1[VX] === v2[VX] && v3[VX] === v4[VX]) {
      console.log('then')

      x = v1[VX]
      y = v1[VY]

    } else if(v1[VX].toFixed(10) === v2[VX].toFixed(10)) {

      x = v1[VX]
      y = K2*x+B2

    } else if(v3[VX].toFixed(10) === v4[VX].toFixed(10)) {

      x = v3[VX]
      y = K1*x+B1

    } else {

      x = (B2 - B1)/(K1 - K2)
      y = K1*x+B1

    }

    var res = new THREE.Vector3

    res[VX] = x
    res[VY] = y

    return res

  }

  /**
   * точка пересечения линий в плоскости XZ
   */
  function lineCrossXZ(line1, line2) {

    var v1 = line1.start
    var v2 = line1.end
    var v3 = line2.start
    var v4 = line2.end

    if(!isCrossLines(v1, v2, v3, v4, 'x', 'z')) return false

    return linesCrossPoint(v1, v2, v3, v4, 'x', 'z')

  }

  function Rectangle(points) {

    this.position = new THREE.Vector3

    this.lines = []
    for(var i = 0; i < 4; i++) 
      this.lines.push(new THREE.Line3(new THREE.Vector3, new THREE.Vector3))

    this.helper = new helper
    this.helper.setLines(this.lines)

    this.sphere = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial({color: 'red'}))
    this.helper.add(this.sphere)

    if(points) {

      this.setFromPoints(points)

    }

  }

  Rectangle.prototype.setFromPoints = function(points) {

    for(var i = 0; i < this.lines.length; i++) {

      var p1 = points[i]
      var p2 = points[i === 3 ? 0 : i+1]

      this.lines[i].start.set(p1[0], 0, p1[1])
      this.lines[i].end.set(p2[0], 0, p2[1])

    }

  }

  Rectangle.prototype.getPoints = function() {

    return this.lines.map(l => l.start)

  }

  Rectangle.prototype.getWorldPoints = function() {

    return this.lines.map(l => l.start.clone().add(this.position))

  }

  Rectangle.prototype.getMovedLines = function(moved) {

    return this.lines.map(l => {
      var res = l.clone()

      res.start.add(moved)
      res.end.add(moved)

      return res
    })
    
  }

  Rectangle.prototype.getWorldLines = function() {

    return this.getMovedLines(this.position)

  }

  Rectangle.prototype.setPosition = function(position) {

    this.position = position

    Object.defineProperty(this.helper, 'position', {
      configurable: true,
			enumerable: true,
			value: position
    })

  }

  Rectangle.prototype.cross = function(rect) {

    var lines1 = this.lines
    var lines2 = rect.getMovedLines(rect.position.clone().sub(this.position))

    this.helper.lines.forEach(line => {
      line[1].material = line[1].material.clone()
      line[1].material.color.setRGB(0, 0, 1)
    })
    rect.helper.lines.forEach(line => {
      line[1].material = line[1].material.clone()
      line[1].material.color.setRGB(0, 0, 1)
    })

    var isCross = false

    for(var i1 in lines1) {

      var line1 = lines1[i1]

      for(var i2 in lines2) {

        var line2 = lines2[i2]

        isCross = lineCrossXZ(line1, line2)
        if(isCross) {
          this.helper.lines[i1][1].material.color.setRGB(1, 0, 0)
          rect.helper.lines[i2][1].material.color.setRGB(1, 0, 0)
          break
        }

      }
      
      if(isCross) break

    }

    if(isCross) {
      sph.position.copy(isCross.add(this.position))
      sph1.position.copy(line1.start.clone().add(this.position))
      sph2.position.copy(line1.end.clone().add(this.position))
      sph3.position.copy(line2.start.clone().add(this.position))
      sph4.position.copy(line2.end.clone().add(this.position))
    }

  }

  return Rectangle

})
