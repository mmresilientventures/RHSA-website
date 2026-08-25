<?php
/**
 * RHSA Insights — Notion database endpoint
 *
 * The Notion token is kept on the server. On Hostinger it is read from
 * /notion-config.php outside public_html.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$config = require dirname(__DIR__, 3) . '/notion-config.php';
$notionToken = $config['notion_token'] ?? '';
$databaseId = '3aef04b577528020b1e4e1bead9434d2';

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
            if ($type === 'multi_select') return implode(', ', array_map(function ($x) { return $x['name'] ?? ''; }, $property['multi_select'] ?? []));
            if ($type === 'date') return $property['date']['start'] ?? $default;
            if ($type === 'url') return $property['url'] ?? $default;
            if ($type === 'checkbox') return !empty($property['checkbox']) ? 'Yes' : 'No';
            if ($type === 'number') return (string)($property['number'] ?? $default);
        }
    }
    return $default;
}

function cover_url($page) {
    $cover = $page['cover'] ?? null;
    if (!$cover) return '';
    if (($cover['type'] ?? '') === 'external') return $cover['external']['url'] ?? '';
    if (($cover['type'] ?? '') === 'file') return $cover['file']['url'] ?? '';
    return '';
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
        if (($ann['code'] ?? false)) $text = '<code>' . $text . '</code>';
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
            return $html !== '' ? '<p>' . $html . '</p>' : '<div class="notion-spacer"></div>';
        case 'heading_1': return '<h2>' . rich_text_html($data['rich_text'] ?? []) . '</h2>';
        case 'heading_2': return '<h3>' . rich_text_html($data['rich_text'] ?? []) . '</h3>';
        case 'heading_3': return '<h4>' . rich_text_html($data['rich_text'] ?? []) . '</h4>';
        case 'bulleted_list_item': return '<li>' . rich_text_html($data['rich_text'] ?? []) . '</li>';
        case 'numbered_list_item': return '<li>' . rich_text_html($data['rich_text'] ?? []) . '</li>';
        case 'quote': return '<blockquote>' . rich_text_html($data['rich_text'] ?? []) . '</blockquote>';
        case 'callout': return '<div class="notion-callout">' . rich_text_html($data['rich_text'] ?? []) . '</div>';
        case 'divider': return '<hr>';
        case 'code':
            $code = htmlspecialchars(plain_text_from_rich_text($data['rich_text'] ?? []), ENT_QUOTES, 'UTF-8');
            return '<pre><code>' . $code . '</code></pre>';
        case 'image':
            $url = '';
            if (($data['type'] ?? '') === 'external') $url = $data['external']['url'] ?? '';
            if (($data['type'] ?? '') === 'file') $url = $data['file']['url'] ?? '';
            if ($url && preg_match('/^https?:\/\//i', $url)) {
                return '<figure><img src="' . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . '" alt=""></figure>';
            }
            return '';
        case 'bookmark':
        case 'embed':
            $url = $data['url'] ?? '';
            if ($url && preg_match('/^https?:\/\//i', $url)) return '<p><a href="' . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . '" target="_blank" rel="noopener noreferrer">View resource</a></p>';
            return '';
        default:
            return '';
    }
}

function page_content_html($pageId, $token) {
    $url = 'https://api.notion.com/v1/blocks/' . rawurlencode($pageId) . '/children?page_size=100';
    $data = notion_request($url, $token);
    if (!is_array($data)) return '';

    $html = '';
    $listType = null;
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
    if ($listType !== null) $html .= '</' . ($listType === 'bulleted_list_item' ? 'ul' : 'ol') . '>';
    return $html;
}

$url = 'https://api.notion.com/v1/databases/' . rawurlencode($databaseId) . '/query';
$payload = json_encode([
    'page_size' => 100,
    'sorts' => [['timestamp' => 'last_edited_time', 'direction' => 'descending']]
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

$articles = [];
foreach (($data['results'] ?? []) as $page) {
    $properties = $page['properties'] ?? [];
    $pageId = $page['id'] ?? '';
    $title = property_value($properties, ['Title', 'Name', 'Article Title'], 'Untitled Insight');
    $category = property_value($properties, ['Category', 'Type', 'Topic'], 'RHSA Insights');
    $excerpt = property_value($properties, ['Excerpt', 'Summary', 'Description'], '');
    $date = property_value($properties, ['Published Date', 'Publish Date', 'Date', 'Published'], $page['last_edited_time'] ?? '');
    $image = property_value($properties, ['Image', 'Featured Image', 'Image URL', 'Cover'], '');
    if ($image === '') $image = cover_url($page);

    $articles[] = [
        'id' => $pageId,
        'title' => $title,
        'category' => $category,
        'excerpt' => $excerpt,
        'date' => $date,
        'image' => $image,
        'url' => $page['url'] ?? '',
        'content' => $pageId ? page_content_html($pageId, $notionToken) : ''
    ];
}

echo json_encode(['success' => true, 'articles' => $articles], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
