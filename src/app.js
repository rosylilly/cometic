var ACCEPTED_EXTS = ['jpg', 'gif', 'png', 'bmp', 'webp'];
var path = require('path');
var zip = require('zip');

function compareFileNames(a, b) {
  var fullWidthNums, i, j, A, B, aa, bb, fwn;
  fullWidthNums = '０１２３４５６７８９';
  i = j = -1;
  a = a.name;
  b = b.name;
  while (true) {
    A = a.charAt(++i).toLowerCase();
    B = b.charAt(++j).toLowerCase();
    if (!A) return -1;
    if (!B) return 1;
    if (~(fwn = fullWidthNums.indexOf(A))) A = ''+fwn;
    if (~(fwn = fullWidthNums.indexOf(B))) B = ''+fwn;
    if (isFinite(A) && isFinite(B)) {
      while ((aa = a.charAt(++i)) && isFinite(aa)
          || ~(fwn = fullWidthNums.indexOf(aa)) && (aa = ''+fwn)) A += aa;
      while ((bb = b.charAt(++j)) && isFinite(bb)
          || ~(fwn = fullWidthNums.indexOf(bb)) && (bb = ''+fwn)) B += bb;
      if (+A === +B) {
        if (A.length === B.length) continue;
        return B.length - A.length;
      } else {
        return +A - +B;
      }
    }
    if (A < B) return -1;
    if (A > B) return 1;
  }
  return 0;
}

Zepto(function($) {
  var Page = function(data, ext) {
    var page = this;

    this.data = data;
    this.img = new Image();

    this.img.onload = function() {
      page.loaded = true;
    };
    this.img.src = "data:image/" + ext + ";base64," + this.data;
  };
  Page.prototype.onload = function(f) {
    if(this.loaded) {
      f(this);
    } else {
      var page = this;
      this.img.onload = function() {
        page.loaded = true;
        f(page);
      }
    }
  }

  window.App = new Vue({
    el: '#app',
    data: {
      window: {
        width: window.innerWidth,
        height: window.innerHeight,
        dppx: window.devicePixelRatio
      },
      book: {
        path: null,
        title: null,
        pages: [],
        idx: 0,
        dir: 0
      },
      maxRatio: 10
    },
    computed: {
      actualWidth: function() {
        return Math.floor(this.window.width * this.window.dppx);
      },
      actualHeight: function() {
        return Math.floor(this.window.height * this.window.dppx);
      },
      title: function() {
        if(this.book.title) {
          return this.book.title + ' - Cometic';
        } else {
          return 'Cometic';
        }
      },
      maxIdx: function() {
        return this.book.pages.length / 2;
      }
    },
    methods: {
      onDragover: function(e) {
        e.preventDefault();

        return false;
      },

      onDragleave: function(e) {
        e.preventDefault();

        return false;
      },

      onDrop: function(e) {
        e.preventDefault();

        if(e.dataTransfer.files.length > 0) {
          this.getBook(e.dataTransfer.files[0]);
        }

        return false;
      },

      openFile: function() {
        this.fileSelector.click();
      },

      selectFile: function(e) {
        var file = App.fileSelector[0].files[0];
        this.getBook(file);

        App.fileSelector.reset();
      },

      getBook: function(file) {
        this.book.path = file.path;
        this.book.title = path.basename(file.path, path.extname(file.path));
        this.book.pages = [];
        this.book.idx = 0;

        var reader = new FileReader();
        var app = this;
        reader.onload = function(e) {
          var zipReader = zip.Reader(new Buffer(e.target.result, 'binary'));
          zipReader.forEach(function(entry) {
            if(entry.isDirectory()) {
              return;
            }

            var fileName = entry.getName();
            var ext = path.extname(fileName).toLowerCase().substr(1);

            if(ACCEPTED_EXTS.indexOf(ext) == -1) {
              return;
            }

            var base64 = entry.getData().toString('base64');

            app.book.pages.push({
              name: fileName,
              ext: ext,
              page: new Page(base64, ext)
            });
          });

          app.book.pages.sort(compareFileNames);

          app.redraw();
        };
        reader.readAsBinaryString(file);
      },

      render: function() {
        var right = this.book.pages[-1+(this.book.idx*2)];
        var left = this.book.pages[0+(this.book.idx*2)];

        var app = this;
        var pageWidth = Math.floor(app.actualWidth / 2);

        app.context.clearRect(0, 0, app.actualWidth, app.actualHeight);
        if(left) {
          left.page.onload(function(page) {
            app.fitDraw(page.img, 0, pageWidth, 'right');
          });
        }

        if(right) {
          right.page.onload(function(page) {
            app.fitDraw(page.img, pageWidth, app.actualWidth - pageWidth, 'left');
          });
        }
      },

      fitDraw: function(img, x, width, align) {
        var iw = img.width, ih = img.height, rw = width, rh = this.actualHeight;
        var ix = x, iy = 0, ratio = this.maxRatio;

        iw *= ratio;
        ih *= ratio;

        if(iw > rw) {
          ratio = rw / iw;
          ih = ih * ratio;
          iw = iw * ratio;
        }
        if(ih > rh) {
          ratio = rh / ih;
          ih = ih * ratio;
          iw = iw * ratio;
        }

        switch(align) {
          case 'left':
            ix = x;
            break;
          case 'right':
            ix = x + (rw - iw);
            break;
          default:
            ix = x + ((rw - iw)/2);
            break;
        }

        iy = (rh - ih) / 2;


        this.context.drawImage(img, ix, iy, iw, ih);
      },

      redraw: function() {
        var app = this;
        requestAnimationFrame(function() {
          app.render();
        });
      },

      forward: function() {
        if(this.book.idx >= this.maxIdx) { return };

        this.book.idx++;
        this.redraw();
      },

      back: function() {
        if(this.book.idx <= 0) { return };

        this.book.idx--;
        this.redraw();
      }
    }
  });

  App.fileSelector = $('#file-selector');
  App.canvas = $('#canvas').get(0);
  App.context = App.canvas.getContext('2d');

  $(window).on('resize', function(e) {
    App.window.width = window.innerWidth;
    App.window.height = window.innerHeight;
    App.redraw();
  });

  $(window).on('dragover drop', function(e) {
    e.preventDefault();
    return false;
  });

  Mousetrap.bind(['left', 'h', 'a'], function() {
    App[['forward', 'back'][App.book.dir]]();
    return false;
  });

  Mousetrap.bind(['right', 'l', 'd'], function() {
    App[['back', 'forward'][App.book.dir]]();
    return false;
  });

  Mousetrap.bind('space', function() {
    App.forward();
    return false;
  });

  Mousetrap.bind('shift+space', function() {
    App.back();
    return false;
  });
});
