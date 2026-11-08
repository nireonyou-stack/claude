<?php
/*
 * sheet/import.roll20.config.php — Roll20 에서 시트를 받을 때 쓰는 열쇠 · 글쓴이
 * 이 파일을 import.roll20.config.php 로 복사한 뒤 두 값을 바꿔 주세요.
 *   key   : 올인원 스크립트 ⚙ 설정 '홈페이지로 보내기 — 열쇠' 칸에 똑같이 넣는 값 (12자 이상, 아무도 모르게)
 *   mb_id : 새 시트 글의 글쓴이 (관리자 아이디 권장 — 새 글은 비밀글이라 관리자 · 글쓴이만 봅니다)
 */
if (!defined('_GNUBOARD_')) exit;
return array(
    'key'   => 'change-this-to-a-long-random-key',
    'mb_id' => 'admin',
);
