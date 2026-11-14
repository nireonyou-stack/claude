#!/bin/bash
# 회귀 묶음: tests/run.sh [테스트 이름 …]  (이름 없으면 전부)
# 결과는 out/<이름>.txt · 줄마다 'errors: []' 수(ok) · ✗ / 오류 수(bad)
# checktest 의 bad=3 은 일부러 넣은 실패 확인이라 정상이다
cd "$(dirname "$0")"
[ -d node_modules ] || npm install --no-audit --no-fund --silent
mkdir -p out
node serve.js > out/serve.log 2>&1 & SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
for i in $(seq 1 30); do curl -s -o /dev/null http://127.0.0.1:8766/blank.html && break; sleep 0.2; done
ALL="navtest checktest mactest scenetest findtest qftest qftest2 docktest docktest2 docktest-pl fittest3 realzoom jtest sorttest zoomui fvtest notetest parttest maptest unloadtest settest libtest fadetest2 jbdtest jbdtest2 jbmenutest edgetest betoggle aftest pztest hometest edgenavtest jbpvtest spktest qetest qptest tbltest lnktest toasttest a11ytest settest2 qfcmdtest dragtest lnkdeltest mscntest ccfscntest tltest tmfittest awtest vbtest abtest wotest gmotest"
for t in ${@:-$ALL}; do
  timeout 180 node $t.js > out/$t.txt 2>&1
  ok=$(grep -c "errors: \[\]" out/$t.txt); bad=$(grep -cE "✗|TimeoutError|Error:|errors: \[.+\]" out/$t.txt)
  echo "$t ok=$ok bad=$bad"
done
