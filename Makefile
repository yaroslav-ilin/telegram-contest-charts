SHELL := /bin/bash

.PHONY : all clean

all : critical.js app.js

critical.js : src/theme.js
	cat $^ | \
java -jar closure-compiler-v20190301.jar \
--compilation_level ADVANCED_OPTIMIZATIONS \
--externs misc/compiler_externs.js \
--js_output_file $@

app.js : src/util.js src/chart-zoomer-view.js src/chart-animation-strategies.js src/chart-view.js src/chart-line-selector-view.js src/chart-presenter.js src/data-loader.js src/index.js
	cat $^ | \
java -jar closure-compiler-v20190301.jar \
--compilation_level ADVANCED_OPTIMIZATIONS \
--externs misc/compiler_externs.js \
--js_output_file $@

clean :
	- rm -f critical.js app.js
