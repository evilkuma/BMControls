
/**
 * Math 
 */

define(function(require) {

  var helper = require('./LinesHelper')
  var _Math = require('./../Math')

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

  Rectangle.prototype.getNearPoint = function(rect) {

    var mv = rect.position.clone().sub(this.position)
    var points2 = rect.getPoints().map(p => p.clone().add(mv))

    var distances = points2.map(p => p.distanceTo(new THREE.Vector3))

    return points2[distances.indexOf(Math.min(...distances))].add(this.position)

  }

  Rectangle.prototype.getTriangles = function() {

    var res = []
    var points = this.getPoints()

    for(var i = 0; i < 4; i++) {

      var i1 = i === 3 ? 0 : i+1
      var i2 = i1 === 3 ? 0 : i1+1

      res.push([points[i], points[i1], points[i2]])

    }

    return res

  }

  Rectangle.prototype.getInsidePoint = function(rect) {

    var mv = rect.position.clone().sub(this.position)
    var points2 = rect.getPoints().map(p => p.clone().add(mv))

    var triangles = this.getTriangles()
    
    var res = []

    for(var point2 of points2) {

      for(var triangle of triangles) {

        if(_Math.pointInTriangle2(point2, ...triangle, 'x', 'z')) {

          res.push(point2.add(this.position))
          break

        }

      }

    }

    return res.length === 0 ? false : res

  }

  Rectangle.prototype.cross = function(rect) {

    var lines1 = this.getWorldLines()
    var lines2 = rect.getWorldLines()

    // from helper
    this.helper.lines.forEach(line => {
      line[1].material = line[1].material.clone()
      line[1].material.color.setRGB(0, 0, 1)
    })
    rect.helper.lines.forEach(line => {
      line[1].material = line[1].material.clone()
      line[1].material.color.setRGB(0, 0, 1)
    })

    var crosses = [], line1, line2

    for(var i1 in lines1) {

      line1 = lines1[i1]

      for(var i2 in lines2) {

        line2 = lines2[i2]

        var isCross = _Math.lineCross2(line1, line2, 'x', 'z')

        if(isCross) {
          // from helper
          this.helper.lines[i1][1].material.color.setRGB(1, 0, 0)
          rect.helper.lines[i2][1].material.color.setRGB(1, 0, 0)

          crosses.push({
            point: isCross,
            line1,
            line2
          })

        }

      }
      
    }

    return crosses.length ? crosses : false

  }

  return Rectangle

})
