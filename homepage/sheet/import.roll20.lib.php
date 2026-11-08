<?php
/*
 * sheet/import.roll20.lib.php — Roll20 캐릭터 → 홈페이지 시트 값 (룰별 짝표)
 * ============================================================
 * 올인원 스크립트가 보낸 캐릭터 한 명:
 *   { id, name, avatar, bio, gmnotes, hint, attrs: [[이름, 지금 값, 최대 값], …], order: { 반복구획: [줄 id, …] } }
 * → array('rule' => 틀 키, 'd' => 시트 값(sht 의 data.d 모양) | null)
 *   d 가 null 이면 짝표가 아직 없는 룰 — 원본 보관만 한다(import.roll20.php).
 * 값 모양은 sheet.lib.php 의 sht_norm_value · sht_norm_col 과 같게 만든다.
 *   머리 칸 = 글 · 능력치 = array(k => 수) · 게이지 = array('c' => 지금, 'm' => 최대) · 체크 = 이름 목록
 *   특기 = array('got' => array('열-행'), 'gap' => array('갭 번호'), 'fear' => array(), 'dead' => array()) · 목록 = 줄 배열(_id)
 * PHP 5.4 호환 — ?? · 클로저 · [] 배열 안 씀
 * ============================================================ */
if (!defined('_GNUBOARD_') && !defined('R20I_TEST')) exit;

/* 속성 목록 → 이름 => array(지금, 최대) (같은 이름이면 뒤의 것) */
function r20i_attrs($char) {
    $A = array();
    if (empty($char['attrs']) || !is_array($char['attrs'])) return $A;
    foreach ($char['attrs'] as $a) {
        if (!is_array($a) || !isset($a[0])) continue;
        $A[(string)$a[0]] = array(isset($a[1]) ? (string)$a[1] : '', isset($a[2]) ? (string)$a[2] : '');
    }
    return $A;
}
function r20i_v($A, $n) { return isset($A[$n]) ? trim($A[$n][0]) : ''; }
function r20i_max($A, $n) { return isset($A[$n]) ? trim($A[$n][1]) : ''; }
/* 수면 수로, 아니면 글 그대로 (빈 값은 '') */
function r20i_num($v) { $v = trim((string)$v); return preg_match('/^-?\d+$/', $v) ? (int)$v : $v; }
function r20i_on($A, $n) { $v = r20i_v($A, $n); return $v !== '' && $v !== '0' && strtolower($v) !== 'off' && strtolower($v) !== 'false'; }
function r20i_uid() { return substr(md5(uniqid('', true) . mt_rand()), 0, 8); }

/* 반복 구획의 줄들 — repeating_<구획>_<줄 id>_<칸> → array(array(칸 => 값), …)
   차례는 Roll20 의 _reporder(스크립트가 order 로 보냄) → 그 밖의 줄은 속성 목록에 처음 나온 차례 */
function r20i_rows($A, $sec, $char) {
    $pre = 'repeating_' . strtolower($sec) . '_';
    $rows = array(); $seen = array();
    foreach ($A as $n => $v) {
        $ln = strtolower($n);
        if (strpos($ln, $pre) !== 0) continue;
        $rest = substr($n, strlen($pre));
        /* 줄 id 는 '-' 로 시작하는 20자 안팎 — 첫 '_' 앞까지 */
        $p = strpos($rest, '_');
        if ($p === false) continue;
        $id = strtolower(substr($rest, 0, $p)); $field = substr($rest, $p + 1);
        if (!isset($rows[$id])) { $rows[$id] = array(); $seen[] = $id; }
        $rows[$id][$field] = $v[0];
    }
    $order = array();
    if (!empty($char['order'][$sec]) && is_array($char['order'][$sec])) foreach ($char['order'][$sec] as $id) $order[] = strtolower((string)$id);
    $out = array();
    foreach ($order as $id) if (isset($rows[$id])) { $out[] = $rows[$id]; unset($rows[$id]); }
    foreach ($seen as $id) if (isset($rows[$id])) $out[] = $rows[$id];
    return $out;
}
function r20i_rv($r, $k) { return isset($r[$k]) ? trim((string)$r[$k]) : ''; }
/* 줄이 비었나 (이름 · 효과 다 비면 뺀다) */
function r20i_blank($r, $keys) { foreach ($keys as $k) if (r20i_rv($r, $k) !== '') return false; return true; }

/* ── 룰 알아보기 ──
   1) 시트 칸 이름 (Roll20 은 바꾼 칸만 저장하므로 늘 있지는 않다)
   2) hint = Roll20 방의 시트 이름(예: 'Blood Moon (Korean)') → 틀의 이름 · 별칭(aliases)과 맞춰 본다 (괄호 · 띄어쓰기 · 기호 무시) */
function r20i_norm($s) { $s = preg_replace('/\([^)]*\)|\[[^\]]*\]/u', '', mb_strtolower((string)$s, 'UTF-8')); return preg_replace('/[^\p{L}\p{N}]+/u', '', $s); }
function r20i_detect($A, $hint) {
    foreach ($A as $n => $v) if (preg_match('/^(sk_(soc|head|arm|body|leg|env)\d+|dmg_(brain|heart|armm|legm)|cond_(panic|omen|bleed))$/', $n)) return 'bloodmoon';
    $h = r20i_norm($hint);
    if ($h === '') return '';
    foreach (glob(dirname(__FILE__) . '/tpl/*.json') as $f) {
        $t = json_decode((string)@file_get_contents($f), true);
        if (!is_array($t)) continue;
        $names = array(basename($f, '.json'));
        if (!empty($t['name'])) $names[] = $t['name'];
        if (!empty($t['aliases']) && is_array($t['aliases'])) $names = array_merge($names, $t['aliases']);
        foreach ($names as $x) if (r20i_norm($x) === $h) return basename($f, '.json');
    }
    return preg_replace('/[^a-z0-9]/', '', strtolower((string)$hint));
}

/* 짝표가 있는 룰 */
function r20i_mapped_rules() { return array('bloodmoon'); }

/* 룰에 맞는 변환 — 짝표가 없으면 d = null */
function r20i_map($char, $hint) {
    $A = r20i_attrs($char);
    $rule = r20i_detect($A, $hint);
    $d = null;
    if ($rule === 'bloodmoon') $d = r20i_map_bloodmoon($A, $char);
    return array('rule' => $rule, 'd' => $d);
}

/* 초상: Roll20 캐릭터 그림 (thumb · med → max 로 큰 그림) */
function r20i_img($char) {
    $u = isset($char['avatar']) ? trim((string)$char['avatar']) : '';
    if (!preg_match('#^https?://#i', $u)) return '';
    return preg_replace('#/(thumb|med|original)\.(png|jpe?g|gif|webp)#i', '/max.$2', $u);
}

/* ══ 블러드문 (Roll20 Blood Moon (Korean) 시트 → tpl/bloodmoon.json) ══ */
function r20i_map_bloodmoon($A, $char) {
    $d = array();
    /* 머리 칸 */
    $head = array('pl' => 'player', 'sex' => 'sex', 'age' => 'age', 'lv' => 'level', 'exp' => 'exp', 'intro' => 'intro_type', 'race' => 'race', 'org' => 'org');
    foreach ($head as $k => $n) { $v = r20i_v($A, $n); if ($v !== '') $d[$k] = ($k === 'lv' || $k === 'exp') ? r20i_num($v) : $v; }
    $w = array_filter(array(r20i_v($A, 'weapon1'), r20i_v($A, 'weapon2')), 'strlen');
    if ($w) $d['weapon'] = implode(' / ', $w);
    $img = r20i_img($char);
    if ($img !== '') $d['img'] = $img;
    /* 특성치 */
    $tr = array();
    foreach (array('atk' => 'attack', 'hit' => 'strike', 'def' => 'defense', 'act' => 'action') as $k => $n) { $v = r20i_v($A, $n); if ($v !== '') $tr[$k] = r20i_num($v); }
    if ($tr) $d['traits'] = $tr;
    /* 게이지 — 최대가 시트에 없으면 틀의 최대(값이 더 크면 값) */
    $dur = r20i_v($A, 'durability');
    if ($dur !== '' && preg_match('/^\d+$/', $dur)) $d['dur'] = array('c' => (int)$dur, 'm' => (int)$dur);
    $g = array('calm' => array('reserve', 6), 'blood' => array('blood', 6), 'tension' => array('tension', 30), 'mad' => array('madness', 10));
    foreach ($g as $k => $x) {
        $v = r20i_v($A, $x[0]);
        if ($v === '' || !preg_match('/^\d+$/', $v)) continue;
        $d[$k] = array('c' => (int)$v, 'm' => max($x[1], (int)$v));
    }
    $pa = 0;
    foreach (array('passion1', 'passion2', 'passion3') as $n) if (r20i_on($A, $n)) $pa++;
    $d['passion'] = array('c' => $pa, 'm' => 3);
    /* 변조 · 부위 대미지 */
    $cond = array(); $cm = array('cond_panic' => '공황', 'cond_omen' => '불길', 'cond_bleed' => '유혈', 'cond_bind' => '포박', 'cond_wound' => '중상', 'cond_hinder' => '방해');
    foreach ($cm as $n => $l) if (r20i_on($A, $n)) $cond[] = $l;
    $d['cond'] = $cond;
    $parts = array(); $pm = array('dmg_brain' => '뇌', 'dmg_armm' => '주팔', 'dmg_legm' => '주다리', 'dmg_digest' => '소화기', 'dmg_sense' => '감각기', 'dmg_mouth' => '입',
        'dmg_breath' => '호흡기', 'dmg_lego' => '반대다리', 'dmg_armo' => '반대팔', 'dmg_heart' => '심장', 'dmg_conf' => '자신감', 'dmg_status' => '지위', 'dmg_daily' => '일상', 'dmg_contact' => '인맥', 'dmg_retreat' => '퇴로');
    foreach ($pm as $n => $l) if (r20i_on($A, $n)) $parts[] = $l;
    $d['parts'] = $parts;
    /* 특기: sk_<분야><2~12> → '열-행' (열 = 사회 · 머리 · 팔 · 동체 · 다리 · 환경 차례, 행 = 2 부터 0) · 갭 A~E → 0~4 */
    $got = array();
    foreach (array('soc', 'head', 'arm', 'body', 'leg', 'env') as $c => $cat)
        for ($r = 2; $r <= 12; $r++) if (r20i_on($A, 'sk_' . $cat . $r)) $got[] = $c . '-' . ($r - 2);
    $gap = array();
    foreach (array('a', 'b', 'c', 'd', 'e') as $i => $x) if (r20i_on($A, 'gap_' . $x)) $gap[] = (string)$i;
    $d['sk'] = array('got' => $got, 'fear' => array(), 'gap' => $gap, 'dead' => array());
    /* 어빌리티 — 개요(flavor)는 효과 뒤에 · 레벨은 이름 칸에 안 넣고 효과 맨 앞에 (Lv n) */
    $ab = array();
    foreach (r20i_rows($A, 'abilities', $char) as $r) {
        if (r20i_blank($r, array('name', 'effect'))) continue;
        $eff = r20i_rv($r, 'effect');
        if (r20i_rv($r, 'lv') !== '') $eff = '(Lv ' . r20i_rv($r, 'lv') . ')' . ($eff !== '' ? ' ' . $eff : '');
        if (r20i_rv($r, 'flavor') !== '') $eff = trim($eff . "\n\n" . r20i_rv($r, 'flavor'));
        $ab[] = array('_id' => r20i_uid(), 'name' => r20i_rv($r, 'name'), 'group' => r20i_rv($r, 'group'), 'type' => r20i_rv($r, 'type'),
            'cost' => r20i_rv($r, 'cost'), 'skill' => r20i_rv($r, 'skill'), 'eff' => $eff);
    }
    $d['abil'] = $ab;
    /* 아이템 */
    $it = array();
    foreach (r20i_rows($A, 'items', $char) as $r) {
        if (r20i_blank($r, array('name', 'effect'))) continue;
        $row = array('_id' => r20i_uid(), 'name' => r20i_rv($r, 'name'), 'kind' => r20i_rv($r, 'kind'), 'eff' => r20i_rv($r, 'effect'));
        if (r20i_rv($r, 'count') !== '') $row['n'] = r20i_num(r20i_rv($r, 'count'));
        $it[] = $row;
    }
    $d['items'] = $it;
    /* 행복 (배덕은 이름 앞에 [배덕]) — 설명 칸이 없는 표라 설명은 뺀다(원본에 남음) */
    $hp = array();
    foreach (r20i_rows($A, 'happiness', $char) as $r) {
        if (r20i_blank($r, array('name'))) continue;
        $nm = r20i_rv($r, 'name');
        if (r20i_rv($r, 'kind') === '배덕') $nm = '[배덕] ' . $nm;
        $hp[] = array('_id' => r20i_uid(), 'name' => $nm, 'link' => r20i_rv($r, 'link'), 'power' => r20i_num(r20i_rv($r, 'power')));
    }
    $d['happy'] = $hp;
    /* 관계 */
    $rel = array();
    foreach (r20i_rows($A, 'relations', $char) as $r) {
        if (r20i_blank($r, array('name'))) continue;
        $rel[] = array('_id' => r20i_uid(), 'name' => r20i_rv($r, 'name'), 'attr' => r20i_rv($r, 'attr'), 'depth' => r20i_num(r20i_rv($r, 'depth')), 'desc' => r20i_rv($r, 'flavor'));
    }
    $d['rel'] = $rel;
    /* 스토리 · 메모 — 체형 · 혈통 · 약점 부위는 메모 맨 앞에 (틀에 칸이 없어서) */
    if (r20i_v($A, 'story') !== '') $d['story'] = r20i_v($A, 'story');
    $memo = array();
    if (r20i_v($A, 'body_type') !== '') $memo[] = '체형 · 혈통: ' . r20i_v($A, 'body_type');
    if (r20i_v($A, 'weak_part') !== '') $memo[] = '약점 부위: ' . r20i_v($A, 'weak_part');
    if (r20i_v($A, 'memo') !== '') $memo[] = (count($memo) ? "\n" : '') . r20i_v($A, 'memo');
    if ($memo) $d['memo'] = implode("\n", $memo);
    return $d;
}
