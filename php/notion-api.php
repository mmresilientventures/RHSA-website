<?php
/**
 * RHSA Insights — Notion database endpoint
 *
 * The Notion token is kept on the server. On Hostinger, set the
 * RHSA_NOTION_TOKEN environment variable. For a simple shared-host setup,
 * you may also place the token in the $notionToken fallback below.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$config = require dirname(__DIR__, 3) . '/notion-config.php';
$notionToken = $config['notion_token'] ?? '';
$databaseId = '3aef04b577528020b1e4e1bead9434d2';

if ($notionToken === '') {
    http_response_code(503);
    echo json_encode([
        'success' => false,
        'error' => 'Notion integration token is not configured on the server.'
    ]);
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
            if ($type === 'multi_select') {
                return implode(', ', array_map(function ($x) { return $x['name'] ?? ''; }, $property['multi_select'] ?? []));
            }
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

$url = 'https://api.notion.com/v1/databases/' . rawurlencode($databaseId) . '/query';
$payload = json_encode([
    'page_size' => 100,
    'sorts' => [
        ['timestamp' => 'last_edited_time', 'direction' => 'descending']
    ]
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
    echo json_encode([
        'success' => false,
        'error' => 'Notion returned an error.',
        'status' => $httpCode
    ]);
    exit;
}

$articles = [];
foreach (($data['results'] ?? []) as $page) {
    $properties = $page['properties'] ?? [];
    $title = property_value($properties, ['Title', 'Name', 'Article Title'], 'Untitled Insight');
    $category = property_value($properties, ['Category', 'Type', 'Topic'], 'RHSA Insights');
    $excerpt = property_value($properties, ['Excerpt', 'Summary', 'Description'], '');
    $date = property_value($properties, ['Published Date', 'Publish Date', 'Date', 'Published'], $page['last_edited_time'] ?? '');
    $image = property_value($properties, ['Image', 'Featured Image', 'Image URL', 'Cover'], '');
    if ($image === '') $image = cover_url($page);

    $articles[] = [
        'id' => $page['id'] ?? '',
        'title' => $title,
        'category' => $category,
        'excerpt' => $excerpt,
        'date' => $date,
        'image' => $image,
        'url' => $page['url'] ?? ''
    ];
}

echo json_encode([
    'success' => true,
    'articles' => $articles
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
