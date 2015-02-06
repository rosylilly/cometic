TARGET=build/last_updated

$(TARGET): package.json src/*.html src/*.js
	nwbuild -o build .
	date > ${TARGET}

build: $(TARGET)

clean:
	rm -rf build

run: ${TARGET}
	nwbuild -r .

.PHONEY: clean build run
