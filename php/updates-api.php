<?php
/**
 * RHSA Updates — Notion database endpoint
 *
 * Notion remains the CMS. The token stays server-side in ../notion-config.php.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$config = require dirname(__DIR__, 3) . '/notion-config.php';
$notionToken = $config['notion_token'] ?? '';
$databaseId = '3c7f04b57752807c8d15d92238160e54';

if ($notionToken === '') {
    http_response_code(503);
    echo json_encode(['success' => false, 'error' => 'Notion integration token is not configured on the server.']);
    exit;
}

function plain_text_from_rich_text($items) {
    $text = '';
    foreach ((array)$items as $item) {
        $text .= $item['plain_text'] ?? ($item['text']['content'] ?? '');
    }
    return trim($text);
}

function property_value($properties, $names, $default = '') {
    foreach ($names as $name) {
        foreach ($properties as $key => $property) {
            if (strcasecmp(trim($key), trim($name)) !== 0) continue;
            $type = $property['type'] ?? '';
            if ($type === 'title') return plain_text_from_rich_text($property['title'] ?? []);
            if ($type === 'rich_text') return plain_text_from_rich_text($property['rich_text'] ?? []);
            if ($type === 'select') return $property['select']['name'] ?? $default;
            if ($type === 'date') return $property['date']['start'] ?? $default;
            if ($type === 'url') return $property['url'] ?? $default;
        }
    }
    return $default;
}

function notion_request($url, $token) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
            'Notion-Version: 2022-06-28'
        ],
        CURLOPT_TIMEOUT => 20,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false || $curlError || $httpCode < 200 || $httpCode >= 300) return null;
    return json_decode($response, true);
}

function rich_text_html($items) {
    $html = '';
    foreach ((array)$items as $item) {
        $text = htmlspecialchars($item['plain_text'] ?? ($item['text']['content'] ?? ''), ENT_QUOTES, 'UTF-8');
        $ann = $item['annotations'] ?? [];
        if (!empty($ann['bold'])) $text = '<strong>' . $text . '</strong>';
        if (!empty($ann['italic'])) $text = '<em>' . $text . '</em>';
        if (!empty($ann['underline'])) $text = '<u>' . $text . '</u>';
        if (!empty($ann['strikethrough'])) $text = '<s>' . $text . '</s>';
        if (!empty($ann['code'])) $text = '<code>' . $text . '</code>';
        $href = $item['href'] ?? ($item['text']['link']['url'] ?? '');
        if ($href && preg_match('/^https?:\/\//i', $href)) {
            $safe = htmlspecialchars($href, ENT_QUOTES, 'UTF-8');
            $text = '<a href="' . $safe . '" target="_blank" rel="noopener noreferrer">' . $text . '</a>';
        }
        $html .= $text;
    }
    return $html;
}

function block_html($block) {
    $type = $block['type'] ?? '';
    $data = $block[$type] ?? [];

    switch ($type) {
        case 'paragraph':
            $html = rich_text_html($data['rich_text'] ?? []);
            return $html !== '' ? '<p>' . $html . '</p>' : '';
        case 'heading_1':
            return '<h2>' . rich_text_html($data['rich_text'] ?? []) . '</h2>';
        case 'heading_2':
            return '<h3>' . rich_text_html($data['rich_text'] ?? []) . '</h3>';
        case 'heading_3':
            return '<h4>' . rich_text_html($data['rich_text'] ?? []) . '</h4>';
        case 'bulleted_list_item':
            return '<li>' . rich_text_html($data['rich_text'] ?? []) . '</li>';
        case 'numbered_list_item':
            return '<li>' . rich_text_html($data['rich_text'] ?? []) . '</li>';
        case 'quote':
            return '<blockquote>' . rich_text_html($data['rich_text'] ?? []) . '</blockquote>';
        case 'callout':
            return '<div class="notion-callout">' . rich_text_html($data['rich_text'] ?? []) . '</div>';
        case 'divider':
            return '<hr>';
        default:
            return '';
    }
}

function page_content_html($pageId, $token) {
    $html = '';
    $listType = null;
    $cursor = null;
    $guard = 0;

    do {
        $url = 'https://api.notion.com/v1/blocks/' . rawurlencode($pageId) . '/children?page_size=100';
        if ($cursor) $url .= '&start_cursor=' . rawurlencode($cursor);

        $data = notion_request($url, $token);
        if (!is_array($data)) break;

        foreach (($data['results'] ?? []) as $block) {
            $type = $block['type'] ?? '';

            if ($type === 'bulleted_list_item' || $type === 'numbered_list_item') {
                if ($listType !== $type) {
                    if ($listType !== null) $html .= '</' . ($listType === 'bulleted_list_item' ? 'ul' : 'ol') . '>';
                    $listType = $type;
                    $html .= '<' . ($type === 'bulleted_list_item' ? 'ul' : 'ol') . '>';
                }
                $html .= block_html($block);
            } else {
                if ($listType !== null) {
                    $html .= '</' . ($listType === 'bulleted_list_item' ? 'ul' : 'ol') . '>';
                    $listType = null;
                }
                $html .= block_html($block);
            }
        }

        $cursor = !empty($data['has_more']) ? ($data['next_cursor'] ?? null) : null;
        $guard++;
    } while ($cursor && $guard < 10);

    if ($listType !== null) $html .= '</' . ($listType === 'bulleted_list_item' ? 'ul' : 'ol') . '>';
    return $html;
}

$url = 'https://api.notion.com/v1/databases/' . rawurlencode($databaseId) . '/query';
$payload = json_encode([
    'page_size' => 100,
    'sorts' => [['property' => 'Publish Date', 'direction' => 'descending']]
]);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $notionToken,
        'Content-Type: application/json',
        'Notion-Version: 2022-06-28'
    ],
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_TIMEOUT => 20,
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false || $curlError) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'Notion request failed.']);
    exit;
}

$data = json_decode($response, true);
if ($httpCode < 200 || $httpCode >= 300 || !is_array($data)) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'Notion returned an error.', 'status' => $httpCode]);
    exit;
}

$updates = [];
foreach (($data['results'] ?? []) as $page) {
    $properties = $page['properties'] ?? [];
    $pageId = $page['id'] ?? '';

    $title = property_value($properties, ['Name', 'Title'], '');
    $category = property_value($properties, ['Category'], '');
    $date = property_value($properties, ['Publish Date', 'Published Date', 'Date'], '');
    $galleryLink = property_value($properties, ['Gallery Link', 'Gallery URL'], '');

    /* Ignore accidental empty rows in the database. */
    if ($title === '' || $date === '') continue;

    $content = $pageId ? page_content_html($pageId, $notionToken) : '';

    $updates[] = [
        'id' => $pageId,
        'title' => $title,
        'category' => $category,
        'date' => $date,
        'galleryLink' => $galleryLink,
        'content' => $content
    ];
}

echo json_encode(
    ['success' => true, 'updates' => $updates],
    JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
);
