<?php
/*
 * sheet/import.roll20.php — Roll20(「롤20 레이아웃2 올인원」 스크립트)에서 보낸 캐릭터를 캐릭터 게시판 SHEET 글로
 * ============================================================
 * POST (본문 = JSON 글, Content-Type 은 text/plain 이어도 된다 — 사전 요청 없이 보내려고)
 *   { op: 'ping', key }                         → { ok, board, rules: [짝표 있는 룰], tpls: [틀 있는 룰] }
 *   { op: 'import', key, char: { id, name, avatar, bio, gmnotes, hint, attrs, order } }
 *     → { ok, mode: 'new' | 'ver' | 'raw', wr_id, url, label, rule, msg }
 *
 * [어디로] 이름(글 제목) · 룰이 같은 SHEET 글이 있으면 그 시트의 '새 판' — 지금 판은 앞선 판으로 남는다(ajax.sheet.php op=ver_new 와 같게).
 *          없으면 새 SHEET 글(비밀글 = 관리자 · 글쓴이만) + 같은 이름 프로필 글이 있으면 그 무리로 잇는다(sht_pc_anchor).
 * [값]     짝표(import.roll20.lib.php)에 있는 칸만 덮어쓴다 — 메모 · 보이기 설정 · 세션 기록 같은 홈페이지 쪽 값은 그대로.
 * [원본]   보낸 캐릭터 전체(속성 · 반복 줄 · 바이오 · GM 메모)를 data/sheet_r20/ 에 JSON 으로 남긴다(백업).
 *          짝표가 아직 없는 룰은 글을 만들지 않고 원본만 남긴다(mode = raw).
 * [권한]   import.roll20.config.php 의 열쇠가 맞아야 한다 · 글쓴이는 그 파일의 mb_id · Roll20(app.roll20.net)에서 온 요청만 응답을 읽을 수 있다.
 * PHP 5.4 호환 — ?? · 클로저 · [] 배열 안 씀
 * ============================================================ */
include_once('../../../../common.php');
include_once(dirname(__FILE__) . '/sheet.lib.php');
include_once(dirname(__FILE__) . '/import.roll20.lib.php');

/* Roll20 에서만 응답을 읽게 */
$r20i_origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if ($r20i_origin === 'https://app.roll20.net') {
    header('Access-Control-Allow-Origin: https://app.roll20.net');
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 600');
}
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;
header('Content-Type: application/json; charset=utf-8');

function r20i_out($a) { echo json_encode($a, JSON_UNESCAPED_UNICODE); exit; }
function r20i_fail($msg) { r20i_out(array('ok' => false, 'error' => $msg)); }
/* 같은 시간이 걸리는 비교 (PHP 5.4 에는 hash_equals 가 없다) */
function r20i_same($a, $b) {
    $a = (string)$a; $b = (string)$b;
    if (strlen($a) !== strlen($b)) return false;
    $x = 0;
    for ($i = 0; $i < strlen($a); $i++) $x |= ord($a[$i]) ^ ord($b[$i]);
    return $x === 0;
}

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') r20i_fail('POST 로만 받습니다.');
$r20i_cfgf = dirname(__FILE__) . '/import.roll20.config.php';
if (!is_file($r20i_cfgf)) r20i_fail('홈페이지에 import.roll20.config.php 가 없습니다 — import.roll20.config.sample.php 를 복사해 열쇠와 글쓴이를 정해 주세요.');
$R20I = include($r20i_cfgf);
if (!is_array($R20I) || empty($R20I['key']) || strlen((string)$R20I['key']) < 12) r20i_fail('import.roll20.config.php 의 열쇠(key)가 비었거나 너무 짧습니다 (12자 이상).');

$r20i_raw = file_get_contents('php://input');
if ($r20i_raw === false || strlen($r20i_raw) > 6 * 1024 * 1024) r20i_fail('보낸 내용이 너무 큽니다.');
$r20i_in = json_decode($r20i_raw, true);
if (!is_array($r20i_in)) r20i_fail('보낸 내용을 읽지 못했습니다.');
if (!r20i_same(isset($r20i_in['key']) ? $r20i_in['key'] : '', $R20I['key'])) { sleep(1); r20i_fail('열쇠가 맞지 않습니다.'); }

$r20i_op = isset($r20i_in['op']) ? (string)$r20i_in['op'] : '';
sht_ensure();
$r20i_T = sht_tables();
$r20i_wt = $g5['write_prefix'] . SHT_BO;

/* ── 연결 확인 ── */
if ($r20i_op === 'ping') {
    $tpls = array();
    foreach (glob(dirname(__FILE__) . '/tpl/*.json') as $f) $tpls[] = basename($f, '.json');
    r20i_out(array('ok' => true, 'board' => SHT_BO, 'rules' => r20i_mapped_rules(), 'tpls' => $tpls));
}
if ($r20i_op !== 'import') r20i_fail('모르는 요청입니다.');

$r20i_c = isset($r20i_in['char']) && is_array($r20i_in['char']) ? $r20i_in['char'] : null;
if (!$r20i_c) r20i_fail('캐릭터가 없습니다.');
$r20i_name = trim(preg_replace('/\s+/u', ' ', isset($r20i_c['name']) ? (string)$r20i_c['name'] : ''));
if ($r20i_name === '') r20i_fail('캐릭터 이름이 없습니다.');
$r20i_name = mb_substr($r20i_name, 0, 120, 'UTF-8');

/* 원본 보관 — data/sheet_r20/<글번호 또는 raw>_<시각>_<Roll20 id>.json (웹에서 못 열게) */
function r20i_backup($tag, $c) {
    $dir = G5_DATA_PATH . '/sheet_r20';
    if (!is_dir($dir)) { @mkdir($dir, G5_DIR_PERMISSION); @chmod($dir, G5_DIR_PERMISSION); }
    if (!is_file($dir . '/.htaccess')) @file_put_contents($dir . '/.htaccess', "Require all denied\nDeny from all\n");
    if (!is_file($dir . '/index.php')) @file_put_contents($dir . '/index.php', '');
    $cid = preg_replace('/[^A-Za-z0-9_-]/', '', isset($c['id']) ? (string)$c['id'] : '');
    $f = $tag . '_' . date('Ymd_His', G5_SERVER_TIME) . ($cid !== '' ? '_' . $cid : '') . '.json';
    $ok = @file_put_contents($dir . '/' . $f, json_encode($c, JSON_UNESCAPED_UNICODE));
    return $ok ? $f : '';
}

$r20i_m = r20i_map($r20i_c, isset($r20i_c['hint']) ? $r20i_c['hint'] : '');
$r20i_rule = $r20i_m['rule'];
if ($r20i_m['d'] === null || !sht_tpl($r20i_rule)) {
    $f = r20i_backup('raw', $r20i_c);
    r20i_out(array('ok' => true, 'mode' => 'raw', 'rule' => $r20i_rule, 'file' => $f,
        'msg' => ($r20i_rule !== '' ? $r20i_rule . ' 은(는) ' : '') . '아직 짝표가 없어 원본만 보관했어요' . ($f === '' ? ' (보관 실패 — data 폴더 쓰기 권한 확인)' : '')));
}

$r20i_label = 'Roll20 ' . date('Y-m-d H:i', G5_SERVER_TIME);       /* 같은 날 여러 번 보내도 판 이름이 갈리게 */
$r20i_qn = sql_real_escape_string($r20i_name);
$r20i_qr = sql_real_escape_string($r20i_rule);

/* 이름 · 룰이 같은 시트 */
$r20i_ex = sql_fetch("SELECT w.wr_id FROM `{$r20i_wt}` w JOIN `{$r20i_T['sheet']}` s ON s.sh_id = w.wr_id
                       WHERE w.wr_is_comment = 0 AND w.wr_1 = '" . SHT_TYPE . "' AND w.wr_subject = '{$r20i_qn}' AND s.sh_rule = '{$r20i_qr}'
                       ORDER BY w.wr_id DESC LIMIT 1", false);
$r20i_wr = ($r20i_ex && !empty($r20i_ex['wr_id'])) ? (int)$r20i_ex['wr_id'] : 0;

/* 짝표 값을 시트 값에 덮는다 — 짝표에 없는 칸(메모가 빈 경우 등)은 홈페이지 값 그대로 */
function r20i_merge($data, $d) {
    foreach ($d as $k => $v) {
        if ($k === 'img' && $v === '') continue;
        $data['d'][$k] = $v;
    }
    return $data;
}

if ($r20i_wr) {
    /* ── 새 판: 지금 판을 앞선 판으로 남기고(ajax.sheet.php op=ver_new 와 같게) 지금 판을 Roll20 값으로 ── */
    $sh = sht_get($r20i_wr);
    if (!$sh) r20i_fail('시트를 읽지 못했습니다.');
    $meta = $sh['meta'];
    sql_query("INSERT INTO `{$r20i_T['ver']}` SET sh_id = {$r20i_wr}, sv_label = '" . sql_real_escape_string($meta['label']) . "',
                sv_data = '" . sql_real_escape_string(json_encode($sh['data'], JSON_UNESCAPED_UNICODE)) . "',
                sv_datetime = '" . G5_TIME_YMDHIS . "'");
    $new_id = (int)sql_insert_id();
    foreach ($meta['sessv'] as $sid => $v) if ((int)$v === 0) $meta['sessv'][$sid] = $new_id;
    $meta['label'] = $r20i_label;
    $vers = sht_versions($r20i_wr);
    $vo = array_values(array_diff(sht_vorder($meta, $vers), array($new_id)));
    $at = array_search(0, $vo, true);
    array_splice($vo, $at === false ? 0 : $at + 1, 0, array($new_id));
    $meta['vorder'] = $vo;
    $f = r20i_backup($r20i_wr, $r20i_c);
    $meta['r20'] = array('id' => isset($r20i_c['id']) ? (string)$r20i_c['id'] : '', 'at' => G5_TIME_YMDHIS, 'file' => $f);
    sht_meta_save($r20i_wr, $meta);
    sht_put($r20i_wr, r20i_merge($sh['data'], $r20i_m['d']));
    r20i_out(array('ok' => true, 'mode' => 'ver', 'rule' => $r20i_rule, 'wr_id' => $r20i_wr, 'label' => $r20i_label, 'vers' => count($vers) + 1,
        'url' => G5_BBS_URL . '/board.php?bo_table=' . SHT_BO . '&wr_id=' . $r20i_wr));
}

/* ── 새 시트 글: 비밀글(관리자 · 글쓴이만) ── */
$r20i_mb = get_member(isset($R20I['mb_id']) ? (string)$R20I['mb_id'] : '');
if (empty($r20i_mb['mb_id'])) r20i_fail('import.roll20.config.php 의 글쓴이(mb_id)를 찾지 못했습니다.');
$r20i_cols = array(
    'wr_num' => get_next_num($r20i_wt), 'wr_reply' => '', 'wr_comment' => 0, 'ca_name' => '', 'wr_option' => 'secret',
    'wr_subject' => $r20i_name, 'wr_content' => 'Roll20 에서 가져온 시트입니다.', 'wr_link1' => '', 'wr_link2' => '', 'wr_link1_hit' => 0, 'wr_link2_hit' => 0,
    'wr_hit' => 0, 'wr_good' => 0, 'wr_nogood' => 0, 'mb_id' => $r20i_mb['mb_id'], 'wr_password' => '',
    'wr_name' => $r20i_mb['mb_nick'] !== '' ? $r20i_mb['mb_nick'] : $r20i_mb['mb_id'], 'wr_email' => isset($r20i_mb['mb_email']) ? $r20i_mb['mb_email'] : '', 'wr_homepage' => '',
    'wr_datetime' => G5_TIME_YMDHIS, 'wr_last' => G5_TIME_YMDHIS, 'wr_ip' => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '', 'wr_1' => SHT_TYPE);
/* 표에 있는 칸만 (그누보드 판마다 칸이 조금씩 다르다) */
$r20i_have = array();
$r20i_q = sql_query("SHOW COLUMNS FROM `{$r20i_wt}`", false);
while ($r20i_q && ($r20i_x = sql_fetch_array($r20i_q))) $r20i_have[$r20i_x['Field']] = 1;
if (isset($r20i_have['wr_seo_title'])) $r20i_cols['wr_seo_title'] = '';
$r20i_set = array();
foreach ($r20i_cols as $k => $v) if (isset($r20i_have[$k])) $r20i_set[] = "`{$k}` = '" . sql_real_escape_string((string)$v) . "'";
sql_query("INSERT INTO `{$r20i_wt}` SET " . implode(', ', $r20i_set));
$r20i_wr = (int)sql_insert_id();
if ($r20i_wr <= 0) r20i_fail('글을 만들지 못했습니다.');
sql_query("UPDATE `{$r20i_wt}` SET wr_parent = {$r20i_wr} WHERE wr_id = {$r20i_wr}");
sql_query("INSERT INTO `{$g5['board_new_table']}` (bo_table, wr_id, wr_parent, bn_datetime, mb_id)
            VALUES ('" . SHT_BO . "', {$r20i_wr}, {$r20i_wr}, '" . G5_TIME_YMDHIS . "', '" . sql_real_escape_string($r20i_mb['mb_id']) . "')", false);
sql_query("UPDATE `{$g5['board_table']}` SET bo_count_write = bo_count_write + 1 WHERE bo_table = '" . SHT_BO . "'", false);

/* 같은 이름 프로필 글(시트 · 관계도가 아닌 원글)이 있으면 그 무리로 */
$r20i_pf = sql_fetch("SELECT wr_id FROM `{$r20i_wt}` WHERE wr_is_comment = 0 AND wr_1 <> '" . SHT_TYPE . "' AND wr_subject = '{$r20i_qn}'
                       AND wr_subject NOT LIKE '%[RELATION]%' AND wr_id <> {$r20i_wr} ORDER BY (wr_reply = '') DESC, wr_id ASC LIMIT 1", false);
$r20i_pc = max(0, sht_pc_anchor($r20i_wr, ($r20i_pf && !empty($r20i_pf['wr_id'])) ? (int)$r20i_pf['wr_id'] : 0));
if (!sht_create($r20i_wr, $r20i_rule, $r20i_pc, $r20i_label, '')) r20i_fail('시트를 만들지 못했습니다 (틀: ' . $r20i_rule . ').');
$sh = sht_get($r20i_wr);
$f = r20i_backup($r20i_wr, $r20i_c);
$meta = $sh['meta'];
$meta['r20'] = array('id' => isset($r20i_c['id']) ? (string)$r20i_c['id'] : '', 'at' => G5_TIME_YMDHIS, 'file' => $f);
sht_meta_save($r20i_wr, $meta);
sht_put($r20i_wr, r20i_merge($sh['data'], $r20i_m['d']));
r20i_out(array('ok' => true, 'mode' => 'new', 'rule' => $r20i_rule, 'wr_id' => $r20i_wr, 'label' => $r20i_label, 'pc' => $r20i_pc,
    'url' => G5_BBS_URL . '/board.php?bo_table=' . SHT_BO . '&wr_id=' . $r20i_wr));
