var ACCEPTED_EXTS = ['jpg', 'gif', 'png', 'bmp', 'webp'];
var ACCEPTED_ARCHIVES = ['zip', 'epub'];
var path = require('path');
var zip = require('zip');
var fs = require('fs');

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
  var Page = function(name, data, ext) {
    var page = this;

    this.name = name;
    this.data = data;
    this.img = new Image();

    this.img.onload = function() {
      page.loaded = true;
    };

    this.loaded = false;
    this.ext = ext;
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
      this.load();
    }
  };
  Page.prototype.load = function() {
    if(this.loaded) { return };

    this.img.src = "data:image/" + this.ext + ";base64," + this.data.toString('base64');
  };

  var onreadyFunc = window.App.onready;
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
      maxRatio: 10,
      preloadNum: 10,
      directory: '',
      bookList: 'hidden',
      loading: false
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
        return Math.floor(this.book.pages.length / 2);
      },

      books: function() {
        var app = this;

        var books =$.grep(
            $.map(fs.readdirSync(this.directory), function(name) {
              var fullpath = path.join(app.directory, name);
              return {
                path: fullpath,
                name: name,
                basename: path.basename(name, path.extname(name)),
                current: fullpath == app.book.path
              };
            }),
            function(file) {
              var ext = path.extname(file.path).toLowerCase().substr(1);

              return ACCEPTED_ARCHIVES.indexOf(ext) != -1;
            });
        books.sort(compareFileNames);

        return books
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

      selectBookByList: function(e, book) {
        if(e) { e.preventDefault(); }

        this.getBook(book);
      },

      getBook: function(file) {
        if(!file) { return; }

        this.directory = path.dirname(file.path);
        this.book.path = file.path;
        this.book.title = path.basename(file.path, path.extname(file.path));
        this.book.pages = [];
        this.book.idx = 0;
        this.rawPages = [];
        this.loading = true;

        this.setBookListScroll();

        var app = this;

        fs.readFile(file.path, function(err, data) {
          if(err) {
            alert("ファイルの読み込みに失敗しました。");
            return;
          }

          var zipReader = zip.Reader(data);
          zipReader.forEach(function(entry) {
            if(entry.isDirectory()) {
              return;
            }

            var fileName = entry.getName();
            var ext = path.extname(fileName).toLowerCase().substr(1);

            if(ACCEPTED_EXTS.indexOf(ext) == -1) {
              return;
            }

            app.book.pages.push({
              name: fileName,
              ext: ext
            });
            app.rawPages.push(new Page(fileName, entry.getData(), ext));
          });

          app.book.pages.sort(compareFileNames);
          app.rawPages.sort(compareFileNames);

          app.loading = false;
          app.redraw();
        });
      },

      render: function() {
        var right = this.rawPages[-1+(this.book.idx*2)];
        var left = this.rawPages[0+(this.book.idx*2)];

        var app = this;
        var pageWidth = Math.floor(app.actualWidth / 2);

        app.context.clearRect(0, 0, app.actualWidth, app.actualHeight);
        if(left) {
          left.onload(function(page) {
            app.fitDraw(page.img, 0, pageWidth, 'right');
          });
        }

        if(right) {
          right.onload(function(page) {
            app.fitDraw(page.img, pageWidth, app.actualWidth - pageWidth, 'left');
          });
        }

        process.nextTick(function() {
          app.preload(1+(app.book.idx*2), app.preloadNum);
        });
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
        this.$emit('render');
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
      },

      preload: function(idx, n) {
        if(n <= 0) { return };

        var page = this.rawPages[idx];
        if(page) {
          page.load();

          var app = this;
          process.nextTick(function() {
            app.preload(idx+1, n-1);
          });
        }
      },

      currentBookIdx: function() {
        var books = this.books;

        var idx = 0;
        var app = this;
        $.each(books, function(i, book) {
          if(book.current) {
            idx = i;
          }
        });

        return idx;
      },

      nextBook: function() {
        var books = this.books;
        var idx = this.currentBookIdx() + 1;
        if(idx >= books.length) {
          idx -= books.length;
        }

        this.getBook(books[idx]);
      },

      prevBook: function() {
        var books = this.books;
        var idx = this.currentBookIdx() - 1;
        if(idx < 0) {
          idx += books.length;
        }

        this.getBook(books[idx]);
      },

      setBookListScroll: function() {
        var app = this;

        requestAnimationFrame(function() {
          var current = $('#books .current');
          var positionTop = current.offset().top + $('#books').scrollTop();
          console.debug(positionTop);
          $('#books').scrollTop(positionTop - (app.window.height / 2) + (current.height() / 2));
        });
      }
    }
  });

  App.fileSelector = $('#file-selector');
  App.canvas = $('#canvas').get(0);
  App.context = App.canvas.getContext('2d');
  App.rawPages = [];

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
  });

  Mousetrap.bind(['right', 'l', 'd'], function() {
    App[['back', 'forward'][App.book.dir]]();
  });

  Mousetrap.bind(['down', 'j', 's'], function() {
    App.nextBook();
  });

  Mousetrap.bind(['up', 'k', 'w'], function() {
    App.prevBook();
  });

  Mousetrap.bind('space', function() {
    App.forward();
  });

  Mousetrap.bind('shift+space', function() {
    App.back();
  });

  Mousetrap.bind(['o', 'q'], function() {
    if(App.bookList != 'mini') {
      App.bookList = 'mini';
    } else {
      App.bookList = 'hidden';
    }
  });

  Mousetrap.bind(['O', 'Q'], function() {
    if(App.bookList != 'full') {
      App.bookList = 'full';
    } else {
      App.bookList = 'hidden';
    }
  });

  App.ready = true;
  if(onreadyFunc) {
    onreadyFunc();
  };
});
