<?php

// =========================
// RHSA Insights - Notion API Test
// =========================

// YOUR NOTION INTEGRATION TOKEN
$notionToken = "";

// YOUR DATABASE ID
$databaseId = "3aef04b577528020b1e4e1bead9434d2";

// Notion API URL
$url = "https://api.notion.com/v1/databases/$databaseId/query";

// Headers
$headers = [
    "Authorization: Bearer $notionToken",
    "Content-Type: application/json",
    "Notion-Version: 2022-06-28"
];

// cURL
$ch = curl_init($url);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);

curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_POSTFIELDS, "{}");

$response = curl_exec($ch);

if (curl_errno($ch)) {
    die("cURL Error: " . curl_error($ch));
}


// Output JSON
header('Content-Type: application/json');
echo $response;

?>