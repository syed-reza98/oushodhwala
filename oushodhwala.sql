-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Sep 22, 2026 at 09:47 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `oushodhwala`
--

-- --------------------------------------------------------

--
-- Table structure for table `api_endpoints`
--

CREATE TABLE `api_endpoints` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `grp` varchar(64) NOT NULL DEFAULT 'general',
  `method` varchar(16) NOT NULL DEFAULT 'GET',
  `url` varchar(2048) NOT NULL DEFAULT '',
  `headers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`headers`)),
  `sample_body` text NOT NULL,
  `auth_kind` varchar(64) NOT NULL DEFAULT 'none',
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `note` text NOT NULL,
  `last_status` int(11) DEFAULT NULL,
  `last_ok` tinyint(1) DEFAULT NULL,
  `last_ms` int(11) DEFAULT NULL,
  `last_tested_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `api_endpoints`
--

INSERT INTO `api_endpoints` (`id`, `name`, `grp`, `method`, `url`, `headers`, `sample_body`, `auth_kind`, `active`, `note`, `last_status`, `last_ok`, `last_ms`, `last_tested_at`, `created_at`, `updated_at`) VALUES
('ep-catalog', 'Catalog', 'internal', 'GET', 'http://127.0.0.1:3030/api/catalog', NULL, '', 'none', 1, 'Catalog JSON', NULL, NULL, NULL, NULL, '2026-09-21 20:06:26.436', '2026-09-21 20:06:26.436'),
('ep-health', 'Public health', 'internal', 'GET', 'http://127.0.0.1:3030/api/public/health', NULL, '', 'none', 1, 'Local health', NULL, NULL, NULL, NULL, '2026-09-21 20:06:26.436', '2026-09-21 20:06:26.436');

-- --------------------------------------------------------

--
-- Table structure for table `api_integrations`
--

CREATE TABLE `api_integrations` (
  `id` varchar(36) NOT NULL,
  `provider` varchar(128) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(64) NOT NULL DEFAULT 'general',
  `base_url` varchar(2048) NOT NULL DEFAULT '',
  `sender_id` varchar(255) NOT NULL DEFAULT '',
  `api_key` varchar(512) NOT NULL DEFAULT '',
  `api_secret` varchar(512) NOT NULL DEFAULT '',
  `config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`config`)),
  `note` text NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `last_ok` tinyint(1) DEFAULT NULL,
  `last_status` int(11) DEFAULT NULL,
  `last_tested_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `api_test_logs`
--

CREATE TABLE `api_test_logs` (
  `id` varchar(36) NOT NULL,
  `endpoint_id` varchar(36) DEFAULT NULL,
  `name` varchar(255) NOT NULL DEFAULT '',
  `method` varchar(16) NOT NULL DEFAULT 'GET',
  `url` varchar(2048) NOT NULL DEFAULT '',
  `status_code` int(11) DEFAULT NULL,
  `ok` tinyint(1) NOT NULL DEFAULT 0,
  `duration_ms` int(11) NOT NULL DEFAULT 0,
  `response_excerpt` text NOT NULL,
  `error` text NOT NULL,
  `actor_id` varchar(36) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `appointments`
--

CREATE TABLE `appointments` (
  `id` varchar(36) NOT NULL,
  `invoice_no` varchar(64) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `doctor_id` varchar(64) NOT NULL,
  `doctor_name` varchar(255) NOT NULL DEFAULT '',
  `doctor_spec` varchar(255) NOT NULL DEFAULT '',
  `mode` varchar(32) NOT NULL DEFAULT 'video',
  `scheduled_at` datetime(3) NOT NULL,
  `patient_name` varchar(255) NOT NULL DEFAULT '',
  `phone` varchar(32) NOT NULL DEFAULT '',
  `note` text DEFAULT NULL,
  `fee` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_method` varchar(64) NOT NULL DEFAULT 'cod',
  `payment_status` varchar(64) NOT NULL DEFAULT 'pending',
  `payment_ref` varchar(128) NOT NULL DEFAULT '',
  `status` varchar(64) NOT NULL DEFAULT 'confirmed',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `join_url` varchar(1024) NOT NULL DEFAULT '',
  `cancel_reason` text DEFAULT NULL,
  `cancelled_at` datetime(3) DEFAULT NULL,
  `refund_status` varchar(64) NOT NULL DEFAULT 'none',
  `refund_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `reminder_sent_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `appointments`
--

INSERT INTO `appointments` (`id`, `invoice_no`, `user_id`, `doctor_id`, `doctor_name`, `doctor_spec`, `mode`, `scheduled_at`, `patient_name`, `phone`, `note`, `fee`, `payment_method`, `payment_status`, `payment_ref`, `status`, `created_at`, `updated_at`, `join_url`, `cancel_reason`, `cancelled_at`, `refund_status`, `refund_amount`, `reminder_sent_at`) VALUES
('9a3e6a14-2963-4831-8183-7752f9ac7a59', 'INV-REM-MUB9EAOY', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'd1', 'ডা. ফারহানা ইসলাম', 'GP', 'video', '2026-09-22 01:06:52.000', 'Reminder Patient', '01700000001', NULL, 500.00, 'cash', 'paid', '', 'confirmed', '2026-09-21 19:06:31.714', '2026-09-21 19:07:58.337', 'https://meet.example/rem', NULL, NULL, 'none', 0.00, '2026-09-21 13:07:58.292'),
('f154cc39-666c-4886-bf14-57bf58ef81c7', 'APT-SMOKE', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'd1', 'ডা. ফারহানা ইসলাম', 'মেডিসিন বিশেষজ্ঞ', 'video', '2026-09-21 14:14:49.452', 'Admin Patient', '01700000000', NULL, 500.00, 'bkash', 'paid', '', 'cancelled', '2026-09-21 18:14:49.453', '2026-09-21 18:14:49.784', '', 'smoke cancel', '2026-09-21 12:14:49.783', 'not_eligible', 0.00, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `appointment_reminders`
--

CREATE TABLE `appointment_reminders` (
  `id` varchar(36) NOT NULL,
  `appointment_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `channel` varchar(32) NOT NULL DEFAULT 'whatsapp',
  `target` varchar(255) NOT NULL DEFAULT '',
  `body` text NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'queued',
  `sent_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `appointment_reminders`
--

INSERT INTO `appointment_reminders` (`id`, `appointment_id`, `user_id`, `channel`, `target`, `body`, `status`, `sent_at`, `created_at`) VALUES
('010a4847-7da2-4bea-8174-259237b549c4', '9a3e6a14-2963-4831-8183-7752f9ac7a59', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'app', '', 'রিমাইন্ডার: ডা. ফারহানা ইসলাম এর সাথে আপনার কনসালটেশন ২২ সেপ, ২০২৬, ১:০৬ AM এ। ইনভয়েস #INV-REM-MUB9EAOY | ভিডিও জয়েন লিংক: https://meet.example/rem', 'sent', '2026-09-21 13:07:58.292', '2026-09-21 19:07:58.328'),
('1f8eea3b-2ad3-4bee-a90c-9cb3bcddc181', '9a3e6a14-2963-4831-8183-7752f9ac7a59', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'sms', '01700000001', 'রিমাইন্ডার: ডা. ফারহানা ইসলাম এর সাথে আপনার কনসালটেশন ২২ সেপ, ২০২৬, ১:০৬ AM এ। ইনভয়েস #INV-REM-MUB9EAOY | ভিডিও জয়েন লিংক: https://meet.example/rem', 'queued', NULL, '2026-09-21 19:07:58.320'),
('76595f1f-159f-47ca-94f1-74acc2cdfc05', '9a3e6a14-2963-4831-8183-7752f9ac7a59', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'email', '', 'রিমাইন্ডার: ডা. ফারহানা ইসলাম এর সাথে আপনার কনসালটেশন ২২ সেপ, ২০২৬, ১:০৬ AM এ। ইনভয়েস #INV-REM-MUB9EAOY | ভিডিও জয়েন লিংক: https://meet.example/rem', 'sent', '2026-09-21 13:07:58.451', '2026-09-21 19:07:58.324'),
('7a63b2f4-9fcd-442d-8de3-141c488c1178', '9a3e6a14-2963-4831-8183-7752f9ac7a59', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'whatsapp', '01700000001', 'রিমাইন্ডার: ডা. ফারহানা ইসলাম এর সাথে আপনার কনসালটেশন ২২ সেপ, ২০২৬, ১:০৬ AM এ। ইনভয়েস #INV-REM-MUB9EAOY | ভিডিও জয়েন লিংক: https://meet.example/rem', 'queued', NULL, '2026-09-21 19:07:58.314');

-- --------------------------------------------------------

--
-- Table structure for table `app_settings`
--

CREATE TABLE `app_settings` (
  `key` varchar(128) NOT NULL,
  `value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`value`)),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `app_settings`
--

INSERT INTO `app_settings` (`key`, `value`, `updated_at`) VALUES
('announcement', '\"\"', '2026-09-21 15:33:52.648'),
('bkash_enabled', '\"true\"', '2026-09-21 15:33:52.653'),
('card_enabled', '\"true\"', '2026-09-21 15:33:52.660'),
('cod_enabled', '\"true\"', '2026-09-21 15:33:52.651'),
('delivery_fee', '\"80\"', '2026-09-21 15:35:29.762'),
('emergency_phone', '\"01700-000911\"', '2026-09-21 15:33:52.644'),
('express_enabled', '\"true\"', '2026-09-21 15:33:52.664'),
('express_eta', '\"৩০–৬০ মিনিট\"', '2026-09-21 15:33:52.669'),
('express_fee', '\"120\"', '2026-09-21 15:33:52.667'),
('free_delivery_min', '\"500\"', '2026-09-21 15:33:52.636'),
('nagad_enabled', '\"true\"', '2026-09-21 15:33:52.656'),
('support_phone', '\"09610-000000\"', '2026-09-21 15:33:52.640');

-- --------------------------------------------------------

--
-- Table structure for table `branches`
--

CREATE TABLE `branches` (
  `id` varchar(36) NOT NULL,
  `code` varchar(32) NOT NULL,
  `name` varchar(255) NOT NULL,
  `name_en` varchar(255) NOT NULL DEFAULT '',
  `address` text NOT NULL,
  `phone` varchar(32) NOT NULL DEFAULT '',
  `is_main` tinyint(1) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `branches`
--

INSERT INTO `branches` (`id`, `code`, `name`, `name_en`, `address`, `phone`, `is_main`, `active`, `created_at`, `updated_at`) VALUES
('0c79a0eb-f01c-44ce-9f8d-10077a4c4be4', 'DHK', 'ঢাকা প্রধান', 'Dhaka Main', 'Gulshan', '017', 0, 1, '2026-09-21 16:22:41.088', '2026-09-21 16:22:41.088'),
('9528259f-aabe-454a-bf87-c47d3d8cb43e', 'CTG', 'চট্টগ্রাম', 'Chittagong', 'Agrabad', '018', 0, 1, '2026-09-21 16:22:41.108', '2026-09-21 16:22:41.108');

-- --------------------------------------------------------

--
-- Table structure for table `campaign_sends`
--

CREATE TABLE `campaign_sends` (
  `id` varchar(36) NOT NULL,
  `segment` varchar(64) NOT NULL,
  `title` varchar(512) NOT NULL,
  `body` text NOT NULL,
  `sent_count` int(11) NOT NULL DEFAULT 0,
  `actor_id` varchar(36) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `campaign_sends`
--

INSERT INTO `campaign_sends` (`id`, `segment`, `title`, `body`, `sent_count`, `actor_id`, `created_at`) VALUES
('67f31f06-a002-4e40-83d7-7472bccc3d93', 'all', 'Smoke campaign', 'Hello from migration', 1, 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', '2026-09-21 16:15:19.581');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` varchar(36) NOT NULL,
  `slug` varchar(120) NOT NULL,
  `name` varchar(255) NOT NULL,
  `name_en` varchar(255) DEFAULT NULL,
  `icon` varchar(64) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `kind` varchar(32) NOT NULL DEFAULT 'product',
  `home_delivery` tinyint(1) NOT NULL DEFAULT 1,
  `home_service` tinyint(1) NOT NULL DEFAULT 0,
  `service_route` varchar(255) NOT NULL DEFAULT '',
  `description` text DEFAULT NULL,
  `description_en` text DEFAULT NULL,
  `eta` varchar(255) NOT NULL DEFAULT '',
  `eta_en` varchar(255) NOT NULL DEFAULT '',
  `base_fee` decimal(12,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `slug`, `name`, `name_en`, `icon`, `sort_order`, `active`, `created_at`, `updated_at`, `kind`, `home_delivery`, `home_service`, `service_route`, `description`, `description_en`, `eta`, `eta_en`, `base_fee`) VALUES
('0ae05f63-edd7-4530-bda9-72036f0992f9', 'medicine-subscription', 'মাসিক ঔষধ সাবস্ক্রিপশন', 'Monthly Medicine Refill', '🔁', 33, 1, '2026-09-21 14:56:55.896', '2026-09-22 12:54:51.527', 'service', 0, 1, '/home-services', 'নিয়মিত ঔষধ প্রতি মাসে স্বয়ংক্রিয়ভাবে বাসায় পৌঁছে যাবে।', 'Regular medicines auto-delivered to your home every month.', 'মাসিক নির্ধারিত দিনে', 'On your monthly date', 0.00),
('0f218502-42b4-4e4f-bcad-69c4ef8452d9', 'oral-care', 'ওরাল ও ডেন্টাল কেয়ার', 'Oral & Dental Care', '🦷', 14, 1, '2026-09-22 12:54:51.442', '2026-09-22 12:54:51.442', 'product', 1, 0, '', 'টুথপেস্ট, মাউথওয়াশ, ডেন্টাল কিট ও ওরাল জেল।', 'Toothpaste, mouthwash, dental kits and oral gels.', '৩০–৯০ মিনিট (ঢাকা)', '30–90 min (Dhaka)', 0.00),
('1785402c-591d-4f69-95cc-0fd04452e95d', 'baby-mom', 'বেবি ও মম কেয়ার', 'Baby & Mom', '🍼', 4, 1, '2026-09-22 12:54:51.391', '2026-09-22 12:54:51.391', 'product', 1, 0, '', '', '', '৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)', '30–90 min (Dhaka), 24–48 hrs (nationwide)', 0.00),
('1cc93064-d1e9-4ef1-a53b-e47b25a7e885', 'ambulance', 'অ্যাম্বুলেন্স সেবা', 'Ambulance Service', '🚑', 34, 1, '2026-09-21 14:56:55.900', '2026-09-22 12:54:51.531', 'service', 0, 1, '/home-services', '২৪/৭ এসি ও আইসিইউ অ্যাম্বুলেন্স জরুরি সেবা।', '24/7 AC and ICU ambulance emergency support.', '৩০–৬০ মিনিট', '30–60 min', 2000.00),
('1ec883ae-a4c9-4ee0-b5d5-0e47ab42e9d9', 'home-nursing', 'হোম নার্সিং', 'Home Nursing', '👩‍⚕️', 26, 1, '2026-09-21 14:56:55.870', '2026-09-22 12:54:51.496', 'service', 0, 1, '/home-services', 'প্রশিক্ষিত নার্স বাসায় গিয়ে ইনজেকশন, ড্রেসিং ও পরিচর্যা করবেন।', 'Trained nurses provide injections, dressing and care at home.', '৪–৬ ঘণ্টার মধ্যে', 'Within 4–6 hrs', 800.00),
('1fca49d1-db1d-4469-926d-4c7821c60cf5', 'vaccination-home', 'টিকা প্রদান (বাসায়)', 'Vaccination at Home', '💉', 30, 1, '2026-09-21 14:56:55.886', '2026-09-22 12:54:51.514', 'service', 0, 1, '/home-services', 'শিশু ও বড়দের টিকা কোল্ড-চেইন মেনে বাসায় প্রদান।', 'Child and adult vaccination at home with cold-chain safety.', '২৪–৪৮ ঘণ্টা', '24–48 hrs', 600.00),
('2090e6f8-58d6-4ce1-a90e-e2fd4291729c', 'lab-home', 'হোম স্যাম্পল কালেকশন', 'Home Sample Collection', '🧪', 29, 1, '2026-09-21 14:56:55.882', '2026-09-22 12:54:51.510', 'service', 0, 1, '/home-diagnostics', 'বাসা থেকে রক্তসহ সব নমুনা সংগ্রহ ও অনলাইন রিপোর্ট।', 'Sample collection from home with online reports.', 'সকাল ৭টা–রাত ৯টা', '7 AM – 9 PM', 150.00),
('2403979b-166d-4d52-91f4-7fa3f1b3084d', 'orthopedic', 'অর্থোপেডিক ও সাপোর্ট', 'Orthopedic & Support', '🦴', 19, 1, '2026-09-22 12:54:51.465', '2026-09-22 12:54:51.465', 'product', 1, 0, '', 'নি-ক্যাপ, বেল্ট, সার্ভিক্যাল কলার ও ব্রেস।', 'Knee caps, belts, cervical collars and braces.', '৩০–৯০ মিনিট (ঢাকা)', '30–90 min (Dhaka)', 0.00),
('2db2c5d2-2ff6-4733-93d6-2deab577854a', 'pet-care', 'পেট কেয়ার', 'Pet Care', '🐾', 10, 1, '2026-09-22 12:54:51.422', '2026-09-22 12:54:51.422', 'product', 1, 0, '', '', '', '৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)', '30–90 min (Dhaka), 24–48 hrs (nationwide)', 0.00),
('32c6ccbd-5c8d-4175-8041-59a022f74a8b', 'mobility', 'চলাচল সহায়ক', 'Mobility Aids', '🦽', 25, 1, '2026-09-22 12:54:51.492', '2026-09-22 12:54:51.492', 'product', 1, 0, '', 'হুইলচেয়ার, ওয়াকার, ক্রাচ ও হাসপাতাল বেড।', 'Wheelchairs, walkers, crutches and hospital beds.', '২৪ ঘণ্টার মধ্যে', 'Within 24 hrs', 0.00),
('35cedc37-1978-40e1-8397-939bc2bd85a9', 'physiotherapy-home', 'ফিজিওথেরাপি (বাসায়)', 'Physiotherapy at Home', '💆', 28, 1, '2026-09-21 14:56:55.878', '2026-09-22 12:54:51.505', 'service', 0, 1, '/home-services', 'সার্টিফায়েড ফিজিওথেরাপিস্টের সেশন বাসায়।', 'Certified physiotherapist sessions at your home.', '২৪ ঘণ্টার মধ্যে', 'Within 24 hrs', 900.00),
('488f58ed-1d74-425b-9fcb-07424236dcd6', 'hygiene', 'স্বাস্থ্যবিধি ও সুরক্ষা', 'Hygiene & Protection', '🧻', 22, 1, '2026-09-22 12:54:51.478', '2026-09-22 12:54:51.478', 'product', 1, 0, '', 'হ্যান্ড স্যানিটাইজার, মাস্ক, গ্লাভস ও ডিসইনফেক্ট্যান্ট।', 'Sanitizers, masks, gloves and disinfectants.', '৩০–৯০ মিনিট (ঢাকা)', '30–90 min (Dhaka)', 0.00),
('4c0d04db-dbed-4029-a56a-b7ce368d6a3d', 'diabetes-care', 'ডায়াবেটিস কেয়ার', 'Diabetes Care', '🩸', 13, 1, '2026-09-22 12:54:51.437', '2026-09-22 12:54:51.437', 'product', 1, 0, '', 'গ্লুকোমিটার, স্ট্রিপ, ইনসুলিন সিরিঞ্জ ও ডায়াবেটিক ফুট কেয়ার।', 'Glucometers, strips, insulin syringes and diabetic foot care.', '৩০–৯০ মিনিট (ঢাকা)', '30–90 min (Dhaka)', 0.00),
('4c815af2-c6d1-4fc4-bded-1b10679b9d52', 'respiratory', 'শ্বাসযন্ত্র ও অক্সিজেন', 'Respiratory & Oxygen', '🫁', 21, 1, '2026-09-22 12:54:51.474', '2026-09-22 12:54:51.474', 'product', 1, 0, '', 'নেবুলাইজার, ইনহেলার স্পেসার, মাস্ক ও পালস অক্সিমিটার।', 'Nebulizers, spacers, masks and pulse oximeters.', '৩০–৯০ মিনিট (ঢাকা)', '30–90 min (Dhaka)', 0.00),
('68b21260-ab63-4004-8804-8b9f90dbb18b', 'supplement', 'সাপ্লিমেন্ট', 'Supplement', '🟠', 5, 1, '2026-09-22 12:54:51.396', '2026-09-22 12:54:51.396', 'product', 1, 0, '', '', '', '৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)', '30–90 min (Dhaka), 24–48 hrs (nationwide)', 0.00),
('69f1b8f2-fdb4-4262-8187-b6b89f32e9c4', 'eye-ear-care', 'চোখ ও কান কেয়ার', 'Eye & Ear Care', '👁️', 15, 1, '2026-09-22 12:54:51.447', '2026-09-22 12:54:51.447', 'product', 1, 0, '', 'আই ড্রপ, লেন্স সলিউশন, ইয়ার ড্রপ ও সুরক্ষা সামগ্রী।', 'Eye drops, lens solutions, ear drops and protective care.', '৩০–৯০ মিনিট (ঢাকা)', '30–90 min (Dhaka)', 0.00),
('6f5cda8a-c73a-411f-88ce-244ea13ea606', 'healthcare', 'স্বাস্থ্য সামগ্রী', 'Healthcare', '🩺', 2, 1, '2026-09-22 12:54:51.368', '2026-09-22 12:54:51.368', 'product', 1, 0, '', '', '', '৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)', '30–90 min (Dhaka), 24–48 hrs (nationwide)', 0.00),
('738a8576-faad-44c6-8546-be57f1c40ce6', 'food', 'খাদ্য ও পুষ্টি', 'Food & Nutrition', '🥣', 11, 1, '2026-09-22 12:54:51.427', '2026-09-22 12:54:51.427', 'product', 1, 0, '', '', '', '৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)', '30–90 min (Dhaka), 24–48 hrs (nationwide)', 0.00),
('738e3820-d45f-473b-8cba-05e53de38288', 'homecare', 'হোম কেয়ার', 'Home Care', '🧼', 9, 1, '2026-09-22 12:54:51.416', '2026-09-22 12:54:51.416', 'product', 1, 0, '', '', '', '৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)', '30–90 min (Dhaka), 24–48 hrs (nationwide)', 0.00),
('75c06fb3-aa3f-4cf9-9579-3aff19dacb3a', 'beauty', 'সৌন্দর্য', 'Beauty', '🧴', 3, 1, '2026-09-22 12:54:51.377', '2026-09-22 12:54:51.377', 'product', 1, 0, '', '', '', '৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)', '30–90 min (Dhaka), 24–48 hrs (nationwide)', 0.00),
('7e4a0e5a-4d85-4755-90c0-a31c6bf234ef', 'elderly-care', 'বয়স্ক পরিচর্যা', 'Elderly Care', '🧓', 18, 1, '2026-09-22 12:54:51.460', '2026-09-22 12:54:51.460', 'product', 1, 0, '', 'অ্যাডাল্ট ডায়াপার, বেড সোর কেয়ার ও পুষ্টি সহায়তা।', 'Adult diapers, bed-sore care and nutrition support.', '৩০–৯০ মিনিট (ঢাকা)', '30–90 min (Dhaka)', 0.00),
('7f697eea-2bee-4ca0-8f3d-fe4b0701fab9', 'women-care', 'নারী স্বাস্থ্য', 'Women\'s Health', '🌸', 16, 1, '2026-09-22 12:54:51.451', '2026-09-22 12:54:51.451', 'product', 1, 0, '', 'ফেমিনিন হাইজিন, প্রেগন্যান্সি কিট, আয়রন ও ক্যালসিয়াম।', 'Feminine hygiene, pregnancy kits, iron and calcium care.', '৩০–৯০ মিনিট (ঢাকা)', '30–90 min (Dhaka)', 0.00),
('9373080b-652d-4e7e-9d98-1fe7639b93e3', 'ayurvedic', 'আয়ুর্বেদিক ও ইউনানি', 'Ayurvedic & Unani', '🪔', 23, 1, '2026-09-22 12:54:51.483', '2026-09-22 12:54:51.483', 'product', 1, 0, '', 'আয়ুর্বেদিক, ইউনানি ও ঐতিহ্যবাহী ঔষধ।', 'Ayurvedic, Unani and traditional remedies.', '৩০–৯০ মিনিট (ঢাকা)', '30–90 min (Dhaka)', 0.00),
('968cce99-6d3b-4c15-aa37-ebfd9834cfc6', 'medicine', 'ঔষধ', 'Medicine', '💊', 1, 1, '2026-09-21 10:05:25.654', '2026-09-22 12:54:51.354', 'product', 1, 0, '', '', '', '৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)', '30–90 min (Dhaka), 24–48 hrs (nationwide)', 0.00),
('9d6d946b-fc08-4b4d-abe8-3c1833200814', 'doctor-home', 'ডাক্তার ভিজিট (বাসায়)', 'Doctor Visit at Home', '🏠', 27, 1, '2026-09-21 14:56:55.874', '2026-09-22 12:54:51.500', 'service', 0, 1, '/home-services', 'অভিজ্ঞ ডাক্তার আপনার বাসায় এসে রোগী দেখবেন।', 'An experienced doctor visits your home for consultation.', 'একই দিনে', 'Same day', 1500.00),
('a5517041-db18-42cd-b78d-1339c6f7ee08', 'sexual-wellness', 'সেক্সুয়াল ওয়েলনেস', 'Sexual Wellness', '❤️', 8, 1, '2026-09-22 12:54:51.412', '2026-09-22 12:54:51.412', 'product', 1, 0, '', '', '', '৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)', '30–90 min (Dhaka), 24–48 hrs (nationwide)', 0.00),
('b30bca9c-c146-4f8e-8491-cd5f3575a231', 'oxygen-rental', 'অক্সিজেন সিলিন্ডার ভাড়া', 'Oxygen Cylinder Rental', '🛢️', 31, 1, '2026-09-21 14:56:55.889', '2026-09-22 12:54:51.518', 'service', 0, 1, '/home-services', 'রিফিলসহ অক্সিজেন সিলিন্ডার ও কনসেনট্রেটর হোম ডেলিভারি।', 'Oxygen cylinders and concentrators delivered with refill.', '২–৪ ঘণ্টা', '2–4 hrs', 1200.00),
('bc49f8ba-640f-4081-a22d-f50456c69737', 'devices', 'ডিভাইস', 'Devices', '🌡️', 7, 1, '2026-09-22 12:54:51.407', '2026-09-22 12:54:51.407', 'product', 1, 0, '', '', '', '৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)', '30–90 min (Dhaka), 24–48 hrs (nationwide)', 0.00),
('cc3e4289-be9d-47fd-999f-42d5f76b1079', 'caregiver', 'কেয়ারগিভার সেবা', 'Caregiver Service', '🤝', 32, 1, '2026-09-21 14:56:55.893', '2026-09-22 12:54:51.522', 'service', 0, 1, '/home-services', 'বয়স্ক ও রোগীর জন্য দৈনিক/মাসিক কেয়ারগিভার।', 'Daily or monthly caregivers for elderly and patients.', '৪৮ ঘণ্টার মধ্যে', 'Within 48 hrs', 1000.00),
('e2712a7e-016b-4fb3-8655-b8476e159270', 'sports-nutrition', 'স্পোর্টস নিউট্রিশন', 'Sports Nutrition', '🏋️', 24, 1, '2026-09-22 12:54:51.487', '2026-09-22 12:54:51.487', 'product', 1, 0, '', 'প্রোটিন, ইলেক্ট্রোলাইট ও ফিটনেস সাপ্লিমেন্ট।', 'Protein, electrolytes and fitness supplements.', '৩০–৯০ মিনিট (ঢাকা)', '30–90 min (Dhaka)', 0.00),
('e5976514-8166-4c28-af90-9454b88fa8dc', 'homeopathy', 'হোমিওপ্যাথি', 'Homeopathy', '⚗️', 12, 1, '2026-09-22 12:54:51.432', '2026-09-22 12:54:51.432', 'product', 1, 0, '', '', '', '৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)', '30–90 min (Dhaka), 24–48 hrs (nationwide)', 0.00),
('e5a12a2f-dbf2-463b-a612-23a4e5534b7a', 'first-aid', 'ফার্স্ট এইড ও সার্জিক্যাল', 'First Aid & Surgical', '🩹', 20, 1, '2026-09-22 12:54:51.470', '2026-09-22 12:54:51.470', 'product', 1, 0, '', 'ব্যান্ডেজ, গজ, অ্যান্টিসেপটিক ও সার্জিক্যাল সামগ্রী।', 'Bandages, gauze, antiseptics and surgical items.', '৩০–৬০ মিনিট (ঢাকা)', '30–60 min (Dhaka)', 0.00),
('eb07288e-0875-4838-a112-48b1692ba811', 'herbal', 'হারবাল', 'Herbal', '🌿', 6, 1, '2026-09-22 12:54:51.402', '2026-09-22 12:54:51.402', 'product', 1, 0, '', '', '', '৩০–৯০ মিনিট (ঢাকা), ২৪–৪৮ ঘণ্টা (সারাদেশ)', '30–90 min (Dhaka), 24–48 hrs (nationwide)', 0.00),
('ffb6aca3-06be-4bb9-adfd-f92e0da66112', 'men-care', 'পুরুষ স্বাস্থ্য', 'Men\'s Health', '🧔', 17, 1, '2026-09-22 12:54:51.456', '2026-09-22 12:54:51.456', 'product', 1, 0, '', 'শেভিং, হেয়ার কেয়ার ও পুরুষদের স্বাস্থ্য সাপ্লিমেন্ট।', 'Grooming, hair care and men\'s wellness supplements.', '৩০–৯০ মিনিট (ঢাকা)', '30–90 min (Dhaka)', 0.00);

-- --------------------------------------------------------

--
-- Table structure for table `chart_accounts`
--

CREATE TABLE `chart_accounts` (
  `code` varchar(32) NOT NULL,
  `name` varchar(255) NOT NULL,
  `name_en` varchar(255) NOT NULL DEFAULT '',
  `kind` varchar(32) NOT NULL DEFAULT 'asset',
  `parent_code` varchar(32) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `chart_accounts`
--

INSERT INTO `chart_accounts` (`code`, `name`, `name_en`, `kind`, `parent_code`, `active`, `created_at`, `updated_at`) VALUES
('1000', 'নগদ', 'Cash', 'asset', NULL, 1, '2026-09-21 19:33:16.627', '2026-09-21 19:33:16.627'),
('1010', 'ব্যাংক', 'Bank', 'asset', NULL, 1, '2026-09-21 19:33:16.630', '2026-09-21 19:33:16.630'),
('1020', 'মোবাইল ব্যাংকিং', 'Mobile Banking', 'asset', NULL, 1, '2026-09-21 19:33:16.633', '2026-09-21 19:33:16.633'),
('1100', 'গ্রাহক পাওনা', 'Accounts Receivable', 'asset', NULL, 1, '2026-09-21 19:33:16.636', '2026-09-21 19:33:16.636'),
('1200', 'স্টক/ইনভেন্টরি', 'Inventory', 'asset', NULL, 1, '2026-09-21 19:33:16.640', '2026-09-21 19:33:16.640'),
('2000', 'সাপ্লায়ার দেনা', 'Accounts Payable', 'liability', NULL, 1, '2026-09-21 19:33:16.643', '2026-09-21 19:33:16.643'),
('3000', 'মূলধন', 'Owner Capital', 'equity', NULL, 1, '2026-09-21 19:33:16.646', '2026-09-21 19:33:16.646'),
('4000', 'বিক্রয় আয়', 'Sales Revenue', 'income', NULL, 1, '2026-09-21 19:33:16.649', '2026-09-21 19:33:16.649'),
('4010', 'ডেলিভারি চার্জ আয়', 'Delivery Income', 'income', NULL, 1, '2026-09-21 19:33:16.652', '2026-09-21 19:33:16.652'),
('5000', 'বিক্রীত পণ্যের ব্যয়', 'Cost of Goods Sold', 'expense', NULL, 1, '2026-09-21 19:33:16.654', '2026-09-21 19:33:16.654'),
('5100', 'বেতন', 'Salary', 'expense', NULL, 1, '2026-09-21 19:33:16.657', '2026-09-21 19:33:16.657'),
('5200', 'ভাড়া', 'Rent', 'expense', NULL, 1, '2026-09-21 19:33:16.659', '2026-09-21 19:33:16.659'),
('5300', 'বিদ্যুৎ ও ইউটিলিটি', 'Utilities', 'expense', NULL, 1, '2026-09-21 19:33:16.662', '2026-09-21 19:33:16.662'),
('5400', 'পরিবহন', 'Transport', 'expense', NULL, 1, '2026-09-21 19:33:16.665', '2026-09-21 19:33:16.665'),
('5500', 'বিপণন', 'Marketing', 'expense', NULL, 1, '2026-09-21 19:33:16.667', '2026-09-21 19:33:16.667'),
('5900', 'অন্যান্য খরচ', 'Other Expense', 'expense', NULL, 1, '2026-09-21 19:33:16.670', '2026-09-21 19:33:16.670'),
('5999', 'টেস্ট খরচ', 'Test Expense', 'expense', NULL, 1, '2026-09-21 19:41:06.704', '2026-09-21 19:41:06.704');

-- --------------------------------------------------------

--
-- Table structure for table `consultation_media`
--

CREATE TABLE `consultation_media` (
  `id` varchar(36) NOT NULL,
  `appointment_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `kind` varchar(64) NOT NULL DEFAULT 'recording',
  `url` varchar(2048) NOT NULL DEFAULT '',
  `name` varchar(512) NOT NULL DEFAULT '',
  `transcript` text NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `consultation_media`
--

INSERT INTO `consultation_media` (`id`, `appointment_id`, `user_id`, `kind`, `url`, `name`, `transcript`, `created_at`) VALUES
('f1e2588e-4fab-4ac7-890d-681fc20ae693', 'f154cc39-666c-4886-bf14-57bf58ef81c7', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'report', 'https://example.com/r.pdf', 'report', '', '2026-09-21 18:14:49.599');

-- --------------------------------------------------------

--
-- Table structure for table `consultation_messages`
--

CREATE TABLE `consultation_messages` (
  `id` varchar(36) NOT NULL,
  `appointment_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `sender` varchar(32) NOT NULL DEFAULT 'patient',
  `body` text NOT NULL,
  `file_url` varchar(2048) NOT NULL DEFAULT '',
  `file_name` varchar(512) NOT NULL DEFAULT '',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `consultation_messages`
--

INSERT INTO `consultation_messages` (`id`, `appointment_id`, `user_id`, `sender`, `body`, `file_url`, `file_name`, `created_at`) VALUES
('dfa7975b-d7f8-4fa0-af47-1d83b542cf60', 'f154cc39-666c-4886-bf14-57bf58ef81c7', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'staff', 'smoke hello', '', '', '2026-09-21 18:14:49.543');

-- --------------------------------------------------------

--
-- Table structure for table `consultation_prescriptions`
--

CREATE TABLE `consultation_prescriptions` (
  `id` varchar(36) NOT NULL,
  `appointment_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `doctor_name` varchar(255) NOT NULL DEFAULT '',
  `patient_name` varchar(255) NOT NULL DEFAULT '',
  `diagnosis` text NOT NULL,
  `advice` text NOT NULL,
  `items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`items`)),
  `follow_up` varchar(32) NOT NULL DEFAULT '',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `deliveries`
--

CREATE TABLE `deliveries` (
  `id` varchar(36) NOT NULL,
  `order_id` varchar(36) NOT NULL,
  `order_no` varchar(64) NOT NULL DEFAULT '',
  `user_id` varchar(36) DEFAULT NULL,
  `rider_id` varchar(36) DEFAULT NULL,
  `status` varchar(64) NOT NULL DEFAULT 'unassigned',
  `eta_minutes` int(11) NOT NULL DEFAULT 45,
  `last_lat` decimal(10,7) DEFAULT NULL,
  `last_lng` decimal(10,7) DEFAULT NULL,
  `last_seen_at` datetime(3) DEFAULT NULL,
  `assigned_at` datetime(3) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `deliveries`
--

INSERT INTO `deliveries` (`id`, `order_id`, `order_no`, `user_id`, `rider_id`, `status`, `eta_minutes`, `last_lat`, `last_lng`, `last_seen_at`, `assigned_at`, `note`, `created_at`, `updated_at`) VALUES
('9a8fdbc6-780f-49d1-9171-b655dd64e8ac', '5afa6162-1107-48e1-a212-dbe4f9c129e5', 'OWTESTRET', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'd32fec6b-a4f0-46da-90f7-7e18a31a0efe', 'in_transit', 45, NULL, NULL, NULL, '2026-09-21 13:00:16.737', NULL, '2026-09-21 19:00:16.739', '2026-09-21 19:00:16.863'),
('f0c5dc2f-e93b-415a-a052-7827d0b2e81e', '4a43fc60-6615-4fa1-b377-198890820d1e', 'OW-SMOKE-MUATH2RZ', NULL, 'd32fec6b-a4f0-46da-90f7-7e18a31a0efe', 'assigned', 45, 23.8100000, 90.4100000, '2026-09-21 06:20:20.775', '2026-09-21 06:20:20.759', NULL, '2026-09-21 12:20:20.760', '2026-09-21 12:20:20.781');

-- --------------------------------------------------------

--
-- Table structure for table `delivery_events`
--

CREATE TABLE `delivery_events` (
  `id` varchar(36) NOT NULL,
  `delivery_id` varchar(36) NOT NULL,
  `status` varchar(64) NOT NULL,
  `note` text NOT NULL,
  `lat` decimal(10,7) DEFAULT NULL,
  `lng` decimal(10,7) DEFAULT NULL,
  `actor` varchar(64) NOT NULL DEFAULT 'system',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `delivery_events`
--

INSERT INTO `delivery_events` (`id`, `delivery_id`, `status`, `note`, `lat`, `lng`, `actor`, `created_at`) VALUES
('3a8253a1-87cf-4203-89d8-c8049f14833b', '9a8fdbc6-780f-49d1-9171-b655dd64e8ac', 'in_transit', 'ডেলিভারি চলছে', NULL, NULL, 'staff', '2026-09-21 19:00:16.866'),
('fe10c4a6-7ede-49a5-bb6b-2acac15cd304', '9a8fdbc6-780f-49d1-9171-b655dd64e8ac', 'assigned', 'Smoke Rider অ্যাসাইন', NULL, NULL, 'staff', '2026-09-21 19:00:16.745');

-- --------------------------------------------------------

--
-- Table structure for table `delivery_notifications`
--

CREATE TABLE `delivery_notifications` (
  `id` varchar(36) NOT NULL,
  `delivery_id` varchar(36) NOT NULL,
  `order_no` varchar(64) NOT NULL DEFAULT '',
  `user_id` varchar(36) NOT NULL,
  `channel` varchar(32) NOT NULL DEFAULT 'sms',
  `target` varchar(255) NOT NULL DEFAULT '',
  `status_key` varchar(64) NOT NULL DEFAULT '',
  `body` text NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'queued',
  `sent_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `delivery_zones`
--

CREATE TABLE `delivery_zones` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `name_en` varchar(255) NOT NULL DEFAULT '',
  `district` varchar(128) NOT NULL DEFAULT '',
  `thana` varchar(128) NOT NULL DEFAULT '',
  `fee` decimal(12,2) NOT NULL DEFAULT 40.00,
  `express_fee` decimal(12,2) NOT NULL DEFAULT 90.00,
  `free_above` decimal(12,2) NOT NULL DEFAULT 0.00,
  `min_order` decimal(12,2) NOT NULL DEFAULT 0.00,
  `eta_minutes` int(11) NOT NULL DEFAULT 60,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `delivery_zones`
--

INSERT INTO `delivery_zones` (`id`, `name`, `name_en`, `district`, `thana`, `fee`, `express_fee`, `free_above`, `min_order`, `eta_minutes`, `active`, `sort_order`, `created_at`, `updated_at`) VALUES
('356ddaf2-2004-4e8b-ac19-711aaa72c4b4', 'মিরপুর', 'Mirpur', 'ঢাকা', 'মিরপুর', 50.00, 100.00, 1200.00, 0.00, 60, 1, 2, '2026-09-21 16:30:10.128', '2026-09-21 16:30:10.128'),
('3de17bfd-9cd9-4b7e-b61d-dbc68078cea7', 'ধানমন্ডি', 'Dhanmondi', 'ঢাকা', 'ধানমন্ডি', 40.00, 90.00, 1000.00, 0.00, 45, 1, 1, '2026-09-21 16:30:10.122', '2026-09-21 16:31:07.703'),
('bf77fe8f-ee57-42ef-8bd2-31aac6cb7fac', 'মোহাম্মদপুর', 'Mohammadpur', 'ঢাকা', 'মোহাম্মদপুর', 45.00, 95.00, 1000.00, 0.00, 55, 1, 5, '2026-09-21 16:30:10.140', '2026-09-21 16:30:10.140'),
('cb78119e-d933-4273-a1b0-714dc7ba871c', 'ঢাকার বাইরে', 'Outside Dhaka', '', '', 120.00, 0.00, 3000.00, 0.00, 1440, 1, 9, '2026-09-21 16:30:10.144', '2026-09-21 16:30:10.144'),
('d256250f-fd60-4f90-bf82-58fffb69db81', 'উত্তরা', 'Uttara', 'ঢাকা', 'উত্তরা', 60.00, 120.00, 1500.00, 0.00, 75, 1, 3, '2026-09-21 16:30:10.131', '2026-09-21 16:30:10.131'),
('d93fd7e7-36a0-433b-8060-b964abbd669c', 'বনানী', 'Banani', 'ঢাকা', 'বনানী', 55.00, 110.00, 1300.00, 0.00, 50, 1, 6, '2026-09-21 16:31:07.652', '2026-09-21 16:31:07.652'),
('e3f21ede-a6dc-42ba-994e-3ed9415d1cbd', 'গুলশান', 'Gulshan', 'ঢাকা', 'গুলশান', 50.00, 100.00, 1200.00, 0.00, 50, 1, 4, '2026-09-21 16:30:10.136', '2026-09-21 16:30:10.136');

-- --------------------------------------------------------

--
-- Table structure for table `diagnostic_bookings`
--

CREATE TABLE `diagnostic_bookings` (
  `id` varchar(36) NOT NULL,
  `booking_no` varchar(64) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `patient_name` varchar(255) NOT NULL DEFAULT '',
  `phone` varchar(32) NOT NULL DEFAULT '',
  `address` text DEFAULT NULL,
  `area` varchar(255) NOT NULL DEFAULT '',
  `scheduled_date` varchar(32) NOT NULL DEFAULT '',
  `slot` varchar(64) NOT NULL DEFAULT '',
  `tests` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`tests`)),
  `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `collection_fee` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_method` varchar(64) NOT NULL DEFAULT 'cod',
  `payment_status` varchar(64) NOT NULL DEFAULT 'pending',
  `status` varchar(64) NOT NULL DEFAULT 'requested',
  `note` text DEFAULT NULL,
  `collector_name` varchar(255) NOT NULL DEFAULT '',
  `collector_phone` varchar(32) NOT NULL DEFAULT '',
  `report_url` varchar(1024) NOT NULL DEFAULT '',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `diagnostic_bookings`
--

INSERT INTO `diagnostic_bookings` (`id`, `booking_no`, `user_id`, `patient_name`, `phone`, `address`, `area`, `scheduled_date`, `slot`, `tests`, `subtotal`, `collection_fee`, `total`, `payment_method`, `payment_status`, `status`, `note`, `collector_name`, `collector_phone`, `report_url`, `created_at`, `updated_at`) VALUES
('e71a8d4a-72fd-4248-b244-2459dd4c63da', 'HD-SMOKE1', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'Smoke Patient', '01711111111', 'Dhaka', '', '2026-09-22', '09-12', '[{\"id\":\"cbc\",\"bn\":\"CBC\",\"price\":400}]', 400.00, 150.00, 550.00, 'cod', 'pending', 'confirmed', NULL, '', '', '', '2026-09-21 15:26:06.290', '2026-09-21 15:26:06.420');

-- --------------------------------------------------------

--
-- Table structure for table `doctors`
--

CREATE TABLE `doctors` (
  `id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `spec` varchar(255) NOT NULL DEFAULT '',
  `degree` varchar(255) NOT NULL DEFAULT '',
  `exp` varchar(128) NOT NULL DEFAULT '',
  `fee` decimal(12,2) NOT NULL DEFAULT 0.00,
  `emoji` varchar(16) NOT NULL DEFAULT '?',
  `photo_url` varchar(1024) NOT NULL DEFAULT '',
  `phone` varchar(32) NOT NULL DEFAULT '',
  `whatsapp` varchar(32) NOT NULL DEFAULT '',
  `video_url` varchar(1024) NOT NULL DEFAULT '',
  `online` tinyint(1) NOT NULL DEFAULT 1,
  `work_start` varchar(16) NOT NULL DEFAULT '10:00',
  `work_end` varchar(16) NOT NULL DEFAULT '22:00',
  `slot_minutes` int(11) NOT NULL DEFAULT 30,
  `work_days` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`work_days`)),
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `doctors`
--

INSERT INTO `doctors` (`id`, `name`, `spec`, `degree`, `exp`, `fee`, `emoji`, `photo_url`, `phone`, `whatsapp`, `video_url`, `online`, `work_start`, `work_end`, `slot_minutes`, `work_days`, `active`, `sort_order`, `created_at`, `updated_at`) VALUES
('d1', 'ডা. ফারহানা ইসলাম', 'মেডিসিন বিশেষজ্ঞ', 'MBBS, FCPS (Medicine)', '১২ বছর', 500.00, '👩‍⚕️', '', '', '', '', 1, '10:00', '22:00', 30, '[0,1,2,3,4,5,6]', 1, 1, '2026-09-21 14:56:55.934', '2026-09-22 12:54:51.820'),
('d2', 'ডা. সাইফুল আলম', 'শিশু বিশেষজ্ঞ', 'MBBS, DCH', '৯ বছর', 600.00, '👨‍⚕️', '', '', '', '', 1, '10:00', '22:00', 30, '[0,1,2,3,4,5,6]', 1, 2, '2026-09-21 14:56:55.937', '2026-09-22 12:54:51.827'),
('d3', 'ডা. নুসরাত জাহান', 'চর্ম ও যৌন রোগ', 'MBBS, DDV', '৭ বছর', 700.00, '👩‍⚕️', '', '', '', '', 1, '10:00', '22:00', 30, '[0,1,2,3,4,5,6]', 1, 3, '2026-09-21 14:56:55.940', '2026-09-22 12:54:51.832'),
('d4', 'ডা. রেজাউল করিম', 'হৃদরোগ বিশেষজ্ঞ', 'MBBS, MD (Cardiology)', '১৫ বছর', 900.00, '🫀', '', '', '', '', 1, '10:00', '22:00', 30, '[0,1,2,3,4,5,6]', 1, 4, '2026-09-21 14:56:55.944', '2026-09-22 12:54:51.837'),
('d5', 'ডা. তানjina আক্তার', 'গাইনি ও প্রসূতি', 'MBBS, FCPS (Gynae)', '১১ বছর', 800.00, '🤰', '', '', '', '', 1, '10:00', '22:00', 30, '[0,1,2,3,4,5,6]', 1, 5, '2026-09-21 14:56:55.947', '2026-09-22 12:54:51.841'),
('d6', 'ডা. মেহেদী হাসান', 'ডায়াবেটিস ও হরমোন', 'MBBS, MD (Endocrinology)', '১০ বছর', 850.00, '🧬', '', '', '', '', 1, '10:00', '22:00', 30, '[0,1,2,3,4,5,6]', 1, 6, '2026-09-21 14:56:55.951', '2026-09-22 12:54:51.845');

-- --------------------------------------------------------

--
-- Table structure for table `doctor_blackouts`
--

CREATE TABLE `doctor_blackouts` (
  `id` varchar(36) NOT NULL,
  `doctor_id` varchar(64) NOT NULL,
  `day` varchar(10) NOT NULL,
  `reason` text NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `doctor_reviews`
--

CREATE TABLE `doctor_reviews` (
  `id` varchar(36) NOT NULL,
  `appointment_id` varchar(36) NOT NULL,
  `doctor_id` varchar(64) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `patient_name` varchar(255) NOT NULL DEFAULT '',
  `rating` int(11) NOT NULL DEFAULT 5,
  `comment` text NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `erp_audit_log`
--

CREATE TABLE `erp_audit_log` (
  `id` varchar(36) NOT NULL,
  `table_name` varchar(128) NOT NULL,
  `action` varchar(64) NOT NULL,
  `record_id` varchar(64) NOT NULL DEFAULT '',
  `label` varchar(512) NOT NULL DEFAULT '',
  `changes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`changes`)),
  `actor_id` varchar(36) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `error_logs`
--

CREATE TABLE `error_logs` (
  `id` varchar(36) NOT NULL,
  `message` text NOT NULL,
  `source` varchar(128) NOT NULL DEFAULT 'client',
  `path` varchar(512) NOT NULL DEFAULT '',
  `stack` text DEFAULT NULL,
  `severity` varchar(32) NOT NULL DEFAULT 'error',
  `user_id` varchar(36) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `error_logs`
--

INSERT INTO `error_logs` (`id`, `message`, `source`, `path`, `stack`, `severity`, `user_id`, `created_at`) VALUES
('aff1c49a-b5b1-11f1-bb8a-a87eeabc54b7', 'smoke test error', 'server', '/admin', NULL, 'error', NULL, '2026-09-21 17:43:39.088');

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `id` varchar(36) NOT NULL,
  `category` varchar(128) NOT NULL DEFAULT 'misc',
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `note` text DEFAULT NULL,
  `paid_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `created_by` varchar(36) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `expenses`
--

INSERT INTO `expenses` (`id`, `category`, `amount`, `note`, `paid_at`, `created_by`, `created_at`, `updated_at`) VALUES
('3b4221d2-650c-4f27-ad84-8afd4337e13d', 'utilities', 50.00, 'erp-smoke', '2026-09-21 12:20:20.578', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', '2026-09-21 12:20:20.578', '2026-09-21 12:20:20.578');

-- --------------------------------------------------------

--
-- Table structure for table `generic_info`
--

CREATE TABLE `generic_info` (
  `id` varchar(36) NOT NULL,
  `key` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL DEFAULT '',
  `name` varchar(512) NOT NULL DEFAULT '',
  `indications` text NOT NULL,
  `indications_en` text NOT NULL,
  `pharmacology` text NOT NULL,
  `pharmacology_en` text NOT NULL,
  `dosage` text NOT NULL,
  `dosage_en` text NOT NULL,
  `interaction` text NOT NULL,
  `interaction_en` text NOT NULL,
  `contraindications` text NOT NULL,
  `contraindications_en` text NOT NULL,
  `side_effects` text NOT NULL,
  `side_effects_en` text NOT NULL,
  `pregnancy` text NOT NULL,
  `pregnancy_en` text NOT NULL,
  `precautions` text NOT NULL,
  `precautions_en` text NOT NULL,
  `therapeutic_class` varchar(255) NOT NULL DEFAULT '',
  `therapeutic_class_en` varchar(255) NOT NULL DEFAULT '',
  `storage` text NOT NULL,
  `storage_en` text NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `generic_info`
--

INSERT INTO `generic_info` (`id`, `key`, `slug`, `name`, `indications`, `indications_en`, `pharmacology`, `pharmacology_en`, `dosage`, `dosage_en`, `interaction`, `interaction_en`, `contraindications`, `contraindications_en`, `side_effects`, `side_effects_en`, `pregnancy`, `pregnancy_en`, `precautions`, `precautions_en`, `therapeutic_class`, `therapeutic_class_en`, `storage`, `storage_en`, `created_at`, `updated_at`) VALUES
('gi-para', 'paracetamol', 'paracetamol', 'Paracetamol', 'Fever and pain', '', '', '', '500mg every 6h', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '2026-09-21 20:06:26.439', '2026-09-21 20:06:26.439');

-- --------------------------------------------------------

--
-- Table structure for table `image_audit_log`
--

CREATE TABLE `image_audit_log` (
  `id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `product_name` varchar(512) NOT NULL DEFAULT '',
  `action` varchar(64) NOT NULL,
  `field` varchar(32) NOT NULL DEFAULT 'box',
  `from_url` varchar(2048) NOT NULL DEFAULT '',
  `to_url` varchar(2048) NOT NULL DEFAULT '',
  `revision_id` varchar(36) DEFAULT NULL,
  `actor_id` varchar(36) DEFAULT NULL,
  `note` text NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `image_audit_log`
--

INSERT INTO `image_audit_log` (`id`, `product_id`, `product_name`, `action`, `field`, `from_url`, `to_url`, `revision_id`, `actor_id`, `note`, `created_at`) VALUES
('25a2bb82-aab6-4ef9-8ef8-a0201cd7e555', 'c98ee73e-af58-45ae-a6a2-33cb885254e3', 'Napa 500mg', 'approve', 'box', '/uploads/product-images/c98ee73e-af58-45ae-a6a2-33cb885254e3/box/195d63aa-4ab9-4159-abde-852ae7b6bdcc.png', 'https://example.com/new-box.png', '61f39092-deae-47a6-822f-8ec772b71faf', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', '', '2026-09-21 18:08:26.766'),
('380a5f2d-ea50-46fc-819e-0382416382a0', 'c98ee73e-af58-45ae-a6a2-33cb885254e3', 'Napa 500mg', 'propose', 'box', '/uploads/product-images/c98ee73e-af58-45ae-a6a2-33cb885254e3/box/195d63aa-4ab9-4159-abde-852ae7b6bdcc.png', 'https://example.com/new-box.png', '61f39092-deae-47a6-822f-8ec772b71faf', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'smoke', '2026-09-21 18:08:26.584'),
('ec7daa55-c532-40a8-ba4d-d2476b598595', 'c98ee73e-af58-45ae-a6a2-33cb885254e3', 'Napa 500mg', 'rollback', 'box', 'https://example.com/new-box.png', '/uploads/product-images/c98ee73e-af58-45ae-a6a2-33cb885254e3/box/195d63aa-4ab9-4159-abde-852ae7b6bdcc.png', '61f39092-deae-47a6-822f-8ec772b71faf', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', '', '2026-09-21 18:08:26.956');

-- --------------------------------------------------------

--
-- Table structure for table `image_import_failures`
--

CREATE TABLE `image_import_failures` (
  `id` varchar(36) NOT NULL,
  `run_id` varchar(36) NOT NULL,
  `product_id` varchar(64) NOT NULL DEFAULT '',
  `product_name` varchar(512) NOT NULL DEFAULT '',
  `source` varchar(128) NOT NULL DEFAULT '',
  `reason` text NOT NULL,
  `url` varchar(2048) NOT NULL DEFAULT '',
  `attempts` int(11) NOT NULL DEFAULT 1,
  `resolved` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `image_import_runs`
--

CREATE TABLE `image_import_runs` (
  `id` varchar(36) NOT NULL,
  `source` varchar(128) NOT NULL DEFAULT '',
  `mode` varchar(64) NOT NULL DEFAULT 'manual',
  `status` varchar(32) NOT NULL DEFAULT 'running',
  `total` int(11) NOT NULL DEFAULT 0,
  `ok_count` int(11) NOT NULL DEFAULT 0,
  `fail_count` int(11) NOT NULL DEFAULT 0,
  `skipped_count` int(11) NOT NULL DEFAULT 0,
  `note` text NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `image_revisions`
--

CREATE TABLE `image_revisions` (
  `id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `product_name` varchar(512) NOT NULL DEFAULT '',
  `field` varchar(32) NOT NULL DEFAULT 'box',
  `before_url` varchar(2048) NOT NULL DEFAULT '',
  `after_url` varchar(2048) NOT NULL DEFAULT '',
  `method` varchar(64) NOT NULL DEFAULT 'manual',
  `source` varchar(255) NOT NULL DEFAULT '',
  `score` decimal(8,2) NOT NULL DEFAULT 0.00,
  `status` varchar(32) NOT NULL DEFAULT 'pending',
  `note` text NOT NULL,
  `reviewed_by` varchar(36) DEFAULT NULL,
  `reviewed_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `image_revisions`
--

INSERT INTO `image_revisions` (`id`, `product_id`, `product_name`, `field`, `before_url`, `after_url`, `method`, `source`, `score`, `status`, `note`, `reviewed_by`, `reviewed_at`, `created_at`, `updated_at`) VALUES
('61f39092-deae-47a6-822f-8ec772b71faf', 'c98ee73e-af58-45ae-a6a2-33cb885254e3', 'Napa 500mg', 'box', '/uploads/product-images/c98ee73e-af58-45ae-a6a2-33cb885254e3/box/195d63aa-4ab9-4159-abde-852ae7b6bdcc.png', 'https://example.com/new-box.png', 'manual', '', 0.00, 'rolled_back', 'smoke', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', '2026-09-21 12:08:26.952', '2026-09-21 18:08:26.577', '2026-09-21 18:08:26.953');

-- --------------------------------------------------------

--
-- Table structure for table `journal_entries`
--

CREATE TABLE `journal_entries` (
  `id` varchar(36) NOT NULL,
  `entry_no` varchar(64) NOT NULL,
  `entry_date` date NOT NULL,
  `memo` text NOT NULL,
  `source` varchar(64) NOT NULL DEFAULT 'manual',
  `ref` varchar(128) NOT NULL DEFAULT '',
  `total` decimal(14,2) NOT NULL DEFAULT 0.00,
  `created_by` varchar(36) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `journal_entries`
--

INSERT INTO `journal_entries` (`id`, `entry_no`, `entry_date`, `memo`, `source`, `ref`, `total`, `created_by`, `created_at`, `updated_at`) VALUES
('d938a923-fd98-414a-8edd-e53d0544416b', 'JV-260921-D938A', '2026-09-21', 'Cash sale smoke', 'manual', '', 500.00, 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', '2026-09-21 19:41:06.678', '2026-09-21 19:41:06.678');

-- --------------------------------------------------------

--
-- Table structure for table `journal_lines`
--

CREATE TABLE `journal_lines` (
  `id` varchar(36) NOT NULL,
  `entry_id` varchar(36) NOT NULL,
  `account_code` varchar(32) NOT NULL,
  `account_name` varchar(255) NOT NULL DEFAULT '',
  `debit` decimal(14,2) NOT NULL DEFAULT 0.00,
  `credit` decimal(14,2) NOT NULL DEFAULT 0.00,
  `note` text NOT NULL,
  `party` varchar(255) NOT NULL DEFAULT '',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `journal_lines`
--

INSERT INTO `journal_lines` (`id`, `entry_id`, `account_code`, `account_name`, `debit`, `credit`, `note`, `party`, `created_at`) VALUES
('1520796d-c286-4d7c-8544-8416d06aaf40', 'd938a923-fd98-414a-8edd-e53d0544416b', '1000', 'নগদ', 500.00, 0.00, '', '', '2026-09-21 19:41:06.679'),
('64f8ae62-3d1b-41a8-8905-e880354d5598', 'd938a923-fd98-414a-8edd-e53d0544416b', '4000', 'বিক্রয় আয়', 0.00, 500.00, '', '', '2026-09-21 19:41:06.680');

-- --------------------------------------------------------

--
-- Table structure for table `lab_tests`
--

CREATE TABLE `lab_tests` (
  `id` varchar(64) NOT NULL,
  `bn` varchar(512) NOT NULL,
  `en` varchar(512) NOT NULL DEFAULT '',
  `price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `mrp` decimal(12,2) NOT NULL DEFAULT 0.00,
  `grp` varchar(64) NOT NULL DEFAULT 'vital',
  `prep` text DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `lab_tests`
--

INSERT INTO `lab_tests` (`id`, `bn`, `en`, `price`, `mrp`, `grp`, `prep`, `active`, `sort_order`, `created_at`, `updated_at`) VALUES
('cbc', 'সিবিসি (কমপ্লিট ব্লাড কাউন্ট)', 'CBC', 400.00, 600.00, 'vital', 'খালি পেটে প্রয়োজন নেই', 1, 1, '2026-09-21 14:56:55.905', '2026-09-22 12:54:51.773'),
('creatinine', 'সিরাম ক্রিয়েটিনিন', 'S. Creatinine', 350.00, 500.00, 'vital', 'প্রস্তুতি লাগে না', 1, 5, '2026-09-21 14:56:55.915', '2026-09-22 12:54:51.792'),
('fbs', 'ব্লাড সুগার (ফাস্টিং)', 'Blood Sugar (FBS)', 150.00, 250.00, 'life_style', '৮-১০ ঘণ্টা খালি পেটে', 1, 2, '2026-09-21 14:56:55.908', '2026-09-22 12:54:51.778'),
('hba1c', 'এইচবিএ১সি', 'HbA1c', 850.00, 1200.00, 'life_style', 'প্রস্তুতি লাগে না', 1, 10, '2026-09-21 14:56:55.928', '2026-09-22 12:54:51.814'),
('lipid', 'লিপিড প্রোফাইল', 'Lipid Profile', 900.00, 1400.00, 'vital', '১২ ঘণ্টা খালি পেটে', 1, 3, '2026-09-21 14:56:55.910', '2026-09-22 12:54:51.782'),
('men', 'পুরুষদের ফুল চেকআপ প্যাকেজ', 'Men Full Checkup', 3100.00, 4800.00, 'checkup_men', '১০ ঘণ্টা খালি পেটে', 1, 8, '2026-09-21 14:56:55.923', '2026-09-22 12:54:51.805'),
('sgpt', 'লিভার ফাংশন (SGPT)', 'SGPT', 300.00, 450.00, 'vital', 'প্রস্তুতি লাগে না', 1, 6, '2026-09-21 14:56:55.918', '2026-09-22 12:54:51.796'),
('smoke-lab', 'স্মোক টেস্ট', 'Smoke Test', 99.00, 99.00, 'vital', NULL, 0, 0, '2026-09-21 14:57:48.458', '2026-09-21 14:57:48.478'),
('tsh', 'থাইরয়েড (TSH)', 'TSH', 700.00, 1000.00, 'vital', 'প্রস্তুতি লাগে না', 1, 4, '2026-09-21 14:56:55.913', '2026-09-22 12:54:51.787'),
('vitd', 'ভিটামিন ডি (25-OH)', 'Vitamin D', 1900.00, 2600.00, 'life_style', 'প্রস্তুতি লাগে না', 1, 9, '2026-09-21 14:56:55.926', '2026-09-22 12:54:51.810'),
('women', 'নারীদের ফুল চেকআপ প্যাকেজ', 'Women Full Checkup', 2900.00, 4500.00, 'checkup_women', '১০ ঘণ্টা খালি পেটে', 1, 7, '2026-09-21 14:56:55.921', '2026-09-22 12:54:51.801');

-- --------------------------------------------------------

--
-- Table structure for table `loyalty_accounts`
--

CREATE TABLE `loyalty_accounts` (
  `user_id` varchar(36) NOT NULL,
  `points_earned` int(11) NOT NULL DEFAULT 0,
  `points_spent` int(11) NOT NULL DEFAULT 0,
  `balance` int(11) NOT NULL DEFAULT 0,
  `tier` varchar(64) NOT NULL DEFAULT 'silver',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `loyalty_accounts`
--

INSERT INTO `loyalty_accounts` (`user_id`, `points_earned`, `points_spent`, `balance`, `tier`, `created_at`, `updated_at`) VALUES
('dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 10, 0, 10, 'silver', '2026-09-21 12:13:46.687', '2026-09-21 12:13:46.687');

-- --------------------------------------------------------

--
-- Table structure for table `loyalty_transactions`
--

CREATE TABLE `loyalty_transactions` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `points` int(11) NOT NULL,
  `kind` varchar(64) NOT NULL DEFAULT 'earn',
  `order_no` varchar(64) NOT NULL DEFAULT '',
  `reason` varchar(255) NOT NULL DEFAULT '',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `loyalty_transactions`
--

INSERT INTO `loyalty_transactions` (`id`, `user_id`, `points`, `kind`, `order_no`, `reason`, `created_at`) VALUES
('1b12b089-1cb0-42f5-b71f-ca7096751f64', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 10, 'earn', '', 'erp-smoke', '2026-09-21 12:13:46.688');

-- --------------------------------------------------------

--
-- Table structure for table `media_assets`
--

CREATE TABLE `media_assets` (
  `id` varchar(36) NOT NULL,
  `url` varchar(2048) NOT NULL,
  `path` varchar(1024) NOT NULL DEFAULT '',
  `name` varchar(512) NOT NULL DEFAULT '',
  `kind` varchar(64) NOT NULL DEFAULT 'other',
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`tags`)),
  `size` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `media_assets`
--

INSERT INTO `media_assets` (`id`, `url`, `path`, `name`, `kind`, `tags`, `size`, `created_at`, `updated_at`) VALUES
('8279a4d9-e1c3-4e36-b910-d92d3b17013b', 'https://example.com/banner.jpg', '', 'banner-test', 'banner', '[]', 0, '2026-09-21 17:02:50.600', '2026-09-21 17:02:50.600');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `title` varchar(512) NOT NULL,
  `body` text NOT NULL,
  `kind` varchar(64) NOT NULL DEFAULT 'general',
  `order_no` varchar(64) NOT NULL DEFAULT '',
  `read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `title`, `body`, `kind`, `order_no`, `read`, `created_at`) VALUES
('62d5052b-c9f2-4241-939f-e5e819cbfb47', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'কনসালটেশন রিমাইন্ডার', 'রিমাইন্ডার: ডা. ফারহানা ইসলাম এর সাথে আপনার কনসালটেশন ২২ সেপ, ২০২৬, ১:০৬ AM এ। ইনভয়েস #INV-REM-MUB9EAOY | ভিডিও জয়েন লিংক: https://meet.example/rem', 'appointment', 'INV-REM-MUB9EAOY', 0, '2026-09-21 19:07:58.333'),
('6fa3fa17-a663-4d79-9a82-1644a722db66', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'Smoke campaign', 'Hello from migration', 'campaign', '', 0, '2026-09-21 16:15:19.574');

-- --------------------------------------------------------

--
-- Table structure for table `offers`
--

CREATE TABLE `offers` (
  `id` varchar(36) NOT NULL,
  `code` varchar(64) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `title_en` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `discount_percent` decimal(5,2) DEFAULT NULL,
  `discount_amount` decimal(12,2) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `starts_at` datetime(3) DEFAULT NULL,
  `ends_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `offers`
--

INSERT INTO `offers` (`id`, `code`, `title`, `title_en`, `description`, `discount_percent`, `discount_amount`, `active`, `starts_at`, `ends_at`, `created_at`, `updated_at`) VALUES
('8a982020-b02a-4ea5-b5e5-2491bfcba00e', 'EID25', 'ঈদ স্পেশাল অফার', 'Eid Special Discount', 'বিশেষ অর্ডারে ২৫ টাকা অতিরিক্ত ছাড়', 5.00, 50.00, 1, NULL, NULL, '2026-09-22 12:54:51.767', '2026-09-22 12:54:51.767'),
('e3946142-b4a1-4395-ba3a-038c569e09d9', 'WELCOME50', 'ওয়েলকাম অফার', 'Welcome Discount 50 Tk', 'প্রথম অর্ডারে ৫০ টাকা ছাড়', 0.00, 50.00, 1, NULL, NULL, '2026-09-22 12:54:51.752', '2026-09-22 12:54:51.752'),
('e51bebfd-bb53-4230-8531-f9189c070fbd', 'HEALTH10', '১০% হেলথকেয়ার ডিসকাউন্ট', '10% Health Discount', 'সব ঔষধ ও স্বাস্থ্য সামগ্রীতে ১০% ছাড়', 10.00, 100.00, 1, NULL, NULL, '2026-09-22 12:54:51.756', '2026-09-22 12:54:51.756');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` varchar(36) NOT NULL,
  `order_no` varchar(64) NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `status` varchar(64) NOT NULL DEFAULT 'pending',
  `payment_method` varchar(64) DEFAULT NULL,
  `payment_status` varchar(64) DEFAULT 'pending',
  `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `delivery_fee` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `customer_name` varchar(255) DEFAULT NULL,
  `customer_phone` varchar(32) DEFAULT NULL,
  `delivery_address` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta`)),
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `public_token` varchar(64) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `order_no`, `user_id`, `status`, `payment_method`, `payment_status`, `subtotal`, `discount`, `delivery_fee`, `total`, `customer_name`, `customer_phone`, `delivery_address`, `notes`, `meta`, `created_at`, `updated_at`, `public_token`) VALUES
('4a43fc60-6615-4fa1-b377-198890820d1e', 'OW-SMOKE-MUATH2RZ', NULL, 'pending', 'cod', 'unpaid', 100.00, 0.00, 40.00, 140.00, NULL, NULL, NULL, NULL, NULL, '2026-09-21 11:40:47.568', '2026-09-21 11:52:33.180', '2d75e545d12f28e4c5'),
('5afa6162-1107-48e1-a212-dbe4f9c129e5', 'OWTESTRET', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'shipped', NULL, 'pending', 100.00, 0.00, 0.00, 100.00, 'Test', '01700000000', NULL, NULL, NULL, '2026-09-21 15:43:04.628', '2026-09-21 19:00:16.753', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `order_events`
--

CREATE TABLE `order_events` (
  `id` varchar(36) NOT NULL,
  `order_id` varchar(36) NOT NULL,
  `status` varchar(64) NOT NULL,
  `note` text NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `order_events`
--

INSERT INTO `order_events` (`id`, `order_id`, `status`, `note`, `created_at`) VALUES
('24538fc8-b828-4e42-8bcf-026e07ff3432', '5afa6162-1107-48e1-a212-dbe4f9c129e5', 'shipped', 'ডেলিভারিম্যান অ্যাসাইন', '2026-09-21 19:00:16.756'),
('50a5bb7b-8eb6-4370-aa30-a5f616261f0b', '5afa6162-1107-48e1-a212-dbe4f9c129e5', 'shipped', 'ডেলিভারি চলছে', '2026-09-21 19:00:16.874'),
('7da7779d-839d-4f6d-842b-a745b4857f12', '5afa6162-1107-48e1-a212-dbe4f9c129e5', 'processing', 'অর্ডার প্রস্তুত হচ্ছে', '2026-09-21 18:27:43.168');

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` varchar(36) NOT NULL,
  `order_id` varchar(36) NOT NULL,
  `product_id` varchar(36) DEFAULT NULL,
  `name` varchar(512) NOT NULL,
  `qty` int(11) NOT NULL DEFAULT 1,
  `unit_price` decimal(12,2) NOT NULL,
  `line_total` decimal(12,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_returns`
--

CREATE TABLE `order_returns` (
  `id` varchar(36) NOT NULL,
  `order_id` varchar(36) DEFAULT NULL,
  `order_no` varchar(64) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `reason` varchar(128) NOT NULL,
  `details` text DEFAULT NULL,
  `photo_urls` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`photo_urls`)),
  `refund_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` varchar(64) NOT NULL DEFAULT 'requested',
  `admin_note` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `order_returns`
--

INSERT INTO `order_returns` (`id`, `order_id`, `order_no`, `user_id`, `reason`, `details`, `photo_urls`, `refund_amount`, `status`, `admin_note`, `created_at`, `updated_at`) VALUES
('5f353116-e962-4373-b7c9-3c0c5a58901d', '5afa6162-1107-48e1-a212-dbe4f9c129e5', 'OWTESTRET', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'damaged', 'smoke test', NULL, 0.00, 'approved', 'ok', '2026-09-21 15:43:04.669', '2026-09-21 15:43:04.714');

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime(3) NOT NULL,
  `used_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `password_reset_tokens`
--

INSERT INTO `password_reset_tokens` (`id`, `user_id`, `token_hash`, `expires_at`, `used_at`, `created_at`) VALUES
('0f952b6e-e142-49fb-a51a-00addc181288', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'b24a72131f1aff38969eb8e811fe2055624ce0c7d051c123e2df2c5c06222508', '2026-09-21 06:42:25.464', NULL, '2026-09-21 11:42:25.466'),
('29343018-3456-4d45-9ff8-1eebc83f1070', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'b6f18e017c8f824bc25c22b149d3dd47585b59122286e426971bd2c9c47c2953', '2026-09-21 06:42:43.412', '2026-09-21 05:42:43.416', '2026-09-21 11:42:43.412'),
('34d6eaf9-f224-4642-b9fb-d2c5ce5cb238', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', '61454bbffd6cef254ca0a8058e895ceab0c990164c31d7d248a05cc25a2a9069', '2026-09-21 06:42:02.497', NULL, '2026-09-21 11:42:02.498'),
('8fe7edec-0dd0-45e5-a341-c032918df2c1', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'e822bdb39ba7135308bc25f1cd59269af75dc2ccc29475d716216c41e3881ce3', '2026-09-21 06:42:43.401', NULL, '2026-09-21 11:42:43.403');

-- --------------------------------------------------------

--
-- Table structure for table `pos_sales`
--

CREATE TABLE `pos_sales` (
  `id` varchar(36) NOT NULL,
  `invoice_no` varchar(64) NOT NULL,
  `customer_name` varchar(255) NOT NULL DEFAULT '',
  `phone` varchar(32) NOT NULL DEFAULT '',
  `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `paid` decimal(12,2) NOT NULL DEFAULT 0.00,
  `due` decimal(12,2) NOT NULL DEFAULT 0.00,
  `method` varchar(64) NOT NULL DEFAULT 'cash',
  `note` text DEFAULT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pos_sales`
--

INSERT INTO `pos_sales` (`id`, `invoice_no`, `customer_name`, `phone`, `subtotal`, `discount`, `total`, `paid`, `due`, `method`, `note`, `created_by`, `created_at`, `updated_at`) VALUES
('782a67b6-ca43-4c50-823e-55ca5379a52e', 'POS-260921-782A6', 'Walk-in', '', 1.50, 0.00, 1.50, 1.50, 0.00, 'cash', NULL, 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', '2026-09-21 12:20:20.405', '2026-09-21 12:20:20.405');

-- --------------------------------------------------------

--
-- Table structure for table `pos_sale_items`
--

CREATE TABLE `pos_sale_items` (
  `id` varchar(36) NOT NULL,
  `sale_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `product_name` varchar(512) NOT NULL DEFAULT '',
  `price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `qty` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pos_sale_items`
--

INSERT INTO `pos_sale_items` (`id`, `sale_id`, `product_id`, `product_name`, `price`, `qty`) VALUES
('a28c43f4-6272-41fe-89cd-53ca690783df', '782a67b6-ca43-4c50-823e-55ca5379a52e', 'c98ee73e-af58-45ae-a6a2-33cb885254e3', 'Napa 500mg', 1.50, 1);

-- --------------------------------------------------------

--
-- Table structure for table `prescriptions`
--

CREATE TABLE `prescriptions` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `status` varchar(64) NOT NULL DEFAULT 'pending',
  `phone` varchar(32) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `admin_note` text DEFAULT NULL,
  `file_paths` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`file_paths`)),
  `ocr_text` text DEFAULT NULL,
  `ocr_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`ocr_json`)),
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `prescriptions`
--

INSERT INTO `prescriptions` (`id`, `user_id`, `status`, `phone`, `note`, `admin_note`, `file_paths`, `ocr_text`, `ocr_json`, `created_at`, `updated_at`) VALUES
('31d9e753-26d1-47bc-af2f-99cd2f36b4f0', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'pending', '01700000000', 'smoke', NULL, '[\"prescriptions/smoke.png\"]', NULL, NULL, '2026-09-21 11:42:43.643', '2026-09-21 11:42:43.643'),
('e1935c08-f89f-4072-9241-831e7a575a42', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'pending', '01700000000', 'smoke', NULL, '[\"prescriptions/smoke.png\"]', NULL, NULL, '2026-09-21 11:42:26.477', '2026-09-21 11:42:26.477');

-- --------------------------------------------------------

--
-- Table structure for table `prescription_audit`
--

CREATE TABLE `prescription_audit` (
  `id` varchar(36) NOT NULL,
  `prescription_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `action` varchar(64) NOT NULL,
  `changes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`changes`)),
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `prescription_shares`
--

CREATE TABLE `prescription_shares` (
  `id` varchar(36) NOT NULL,
  `prescription_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `token` varchar(64) NOT NULL,
  `scopes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`scopes`)),
  `expires_at` datetime(3) NOT NULL,
  `revoked` tinyint(1) NOT NULL DEFAULT 0,
  `views` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` varchar(36) NOT NULL,
  `name` varchar(512) NOT NULL,
  `en` varchar(512) DEFAULT NULL,
  `base_name` varchar(512) DEFAULT NULL,
  `brand` varchar(255) DEFAULT NULL,
  `category` varchar(255) DEFAULT NULL,
  `generic` varchar(512) DEFAULT NULL,
  `form` varchar(128) DEFAULT NULL,
  `strength` varchar(128) DEFAULT NULL,
  `pack` varchar(128) DEFAULT NULL,
  `manufacturer` varchar(255) DEFAULT NULL,
  `price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `mrp` decimal(12,2) NOT NULL DEFAULT 0.00,
  `stock` int(11) NOT NULL DEFAULT 0,
  `low_stock_threshold` int(11) NOT NULL DEFAULT 10,
  `rx` tinyint(1) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `image_url` varchar(1024) DEFAULT NULL,
  `medicine_image_url` varchar(1024) DEFAULT NULL,
  `emoji` varchar(16) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `description_en` text DEFAULT NULL,
  `indications` text DEFAULT NULL,
  `indications_en` text DEFAULT NULL,
  `dosage` text DEFAULT NULL,
  `dosage_en` text DEFAULT NULL,
  `side_effects` text DEFAULT NULL,
  `side_effects_en` text DEFAULT NULL,
  `contraindications` text DEFAULT NULL,
  `contraindications_en` text DEFAULT NULL,
  `precautions` text DEFAULT NULL,
  `precautions_en` text DEFAULT NULL,
  `pregnancy` text DEFAULT NULL,
  `pregnancy_en` text DEFAULT NULL,
  `storage` text DEFAULT NULL,
  `storage_en` text DEFAULT NULL,
  `therapeutic_class` varchar(255) DEFAULT NULL,
  `therapeutic_class_en` varchar(255) DEFAULT NULL,
  `rating` decimal(3,2) DEFAULT 0.00,
  `reviews` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `name`, `en`, `base_name`, `brand`, `category`, `generic`, `form`, `strength`, `pack`, `manufacturer`, `price`, `mrp`, `stock`, `low_stock_threshold`, `rx`, `active`, `image_url`, `medicine_image_url`, `emoji`, `description`, `description_en`, `indications`, `indications_en`, `dosage`, `dosage_en`, `side_effects`, `side_effects_en`, `contraindications`, `contraindications_en`, `precautions`, `precautions_en`, `pregnancy`, `pregnancy_en`, `storage`, `storage_en`, `therapeutic_class`, `therapeutic_class_en`, `rating`, `reviews`, `created_at`, `updated_at`) VALUES
('acne-mask', 'ন্যাচারাল অ্যাকনে কেয়ার মাস্ক', 'Natural Acne Care Mask', 'Natural', 'Skin Cafe', 'beauty', 'Skin Care', 'মাস্ক', NULL, '১০০ গ্রাম', NULL, 237.00, 280.00, 120, 15, 0, 1, '/uploads/product-images/acne-mask/box/acne-mask.svg', '/uploads/product-images/acne-mask/box/acne-mask.svg', '🎭', 'ন্যাচারাল অ্যাকনে কেয়ার মাস্ক (Natural Acne Care Mask) — Skin Care। Skin Cafe কর্তৃক উৎপাদিত মাস্ক। ১০০ গ্রাম প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'ন্যাচারাল অ্যাকনে কেয়ার মাস্ক (Natural Acne Care Mask) — Skin Care। Skin Cafe কর্তৃক উৎপাদিত মাস্ক। ১০০ গ্রাম প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.50, 78, '2026-09-22 12:54:51.629', '2026-09-22 12:54:51.629'),
('arnica-30', 'আর্নিকা মন্টানা ৩০', 'Arnica Montana 30', 'Arnica', 'Dr. Reckeweg', 'homeopathy', 'Homeopathy', 'ড্রপ', NULL, '১১ মি.লি.', NULL, 320.00, 380.00, 120, 15, 0, 1, '/uploads/product-images/arnica-30/box/arnica-30.svg', '/uploads/product-images/arnica-30/box/arnica-30.svg', '⚗️', 'আর্নিকা মন্টানা ৩০ (Arnica Montana 30) — Homeopathy। Dr. Reckeweg কর্তৃক উৎপাদিত ড্রপ। ১১ মি.লি. প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'আর্নিকা মন্টানা ৩০ (Arnica Montana 30) — Homeopathy। Dr. Reckeweg কর্তৃক উৎপাদিত ড্রপ। ১১ মি.লি. প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.40, 45, '2026-09-22 12:54:51.713', '2026-09-22 12:54:51.713'),
('ashwagandha', 'অশ্বগন্ধা ক্যাপসুল', 'Ashwagandha Capsule', 'Ashwagandha', 'NatureBell', 'herbal', 'Ashwagandha', 'ক্যাপসুল', NULL, '৬০ পিস', NULL, 1490.00, 2100.00, 120, 15, 0, 1, '/uploads/product-images/ashwagandha/box/ashwagandha.svg', '/uploads/product-images/ashwagandha/box/ashwagandha.svg', '🌱', 'অশ্বগন্ধা ক্যাপসুল (Ashwagandha Capsule) — Ashwagandha। NatureBell কর্তৃক উৎপাদিত ক্যাপসুল। ৬০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'অশ্বগন্ধা ক্যাপসুল (Ashwagandha Capsule) — Ashwagandha। NatureBell কর্তৃক উৎপাদিত ক্যাপসুল। ৬০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.50, 88, '2026-09-22 12:54:51.705', '2026-09-22 12:54:51.705'),
('azithro-500', 'এজিথ্রোমাইসিন ৫০০ মিগ্রা', 'Azithromycin 500mg', 'Azithromycin', 'Incepta', 'medicine', 'Azithromycin', 'ট্যাবলেট', NULL, '৩ পিস', NULL, 105.00, 120.00, 120, 15, 1, 1, '/uploads/product-images/azithro-500/box/azithro-500.svg', '/uploads/product-images/azithro-500/box/azithro-500.svg', '💊', 'এজিথ্রোমাইসিন ৫০০ মিগ্রা (Azithromycin 500mg) — Azithromycin। Incepta কর্তৃক উৎপাদিত ট্যাবলেট। ৩ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'এজিথ্রোমাইসিন ৫০০ মিগ্রা (Azithromycin 500mg) — Azithromycin। Incepta কর্তৃক উৎপাদিত ট্যাবলেট। ৩ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.50, 66, '2026-09-22 12:54:51.571', '2026-09-22 12:54:51.571'),
('baby-diaper', 'বেবি ডায়াপার প্যান্টস (M)', 'Baby Diaper Pants (M)', 'Baby', 'Pampers', 'baby-mom', 'Baby Care', 'ডায়াপার', NULL, '৩৪ পিস', NULL, 1120.00, 1350.00, 120, 15, 0, 1, '/uploads/product-images/baby-diaper/box/baby-diaper.svg', '/uploads/product-images/baby-diaper/box/baby-diaper.svg', '🍼', 'বেবি ডায়াপার প্যান্টস (M) (Baby Diaper Pants (M)) — Baby Care। Pampers কর্তৃক উৎপাদিত ডায়াপার। ৩৪ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'বেবি ডায়াপার প্যান্টস (M) (Baby Diaper Pants (M)) — Baby Care। Pampers কর্তৃক উৎপাদিত ডায়াপার। ৩৪ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.70, 310, '2026-09-22 12:54:51.637', '2026-09-22 12:54:51.637'),
('baby-lotion', 'বেবি লোশন ২০০ মি.লি.', 'Baby Lotion 200ml', 'Baby', 'Johnson\'s', 'baby-mom', 'Baby Care', 'লোশন', NULL, '২০০ মি.লি.', NULL, 470.00, 550.00, 120, 15, 0, 1, '/uploads/product-images/baby-lotion/box/baby-lotion.svg', '/uploads/product-images/baby-lotion/box/baby-lotion.svg', '🧸', 'বেবি লোশন ২০০ মি.লি. (Baby Lotion 200ml) — Baby Care। Johnson\'s কর্তৃক উৎপাদিত লোশন। ২০০ মি.লি. প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'বেবি লোশন ২০০ মি.লি. (Baby Lotion 200ml) — Baby Care। Johnson\'s কর্তৃক উৎপাদিত লোশন। ২০০ মি.লি. প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.60, 180, '2026-09-22 12:54:51.648', '2026-09-22 12:54:51.648'),
('bp-monitor', 'ডিজিটাল ব্লাড প্রেসার মেশিন', 'Digital BP Monitor', 'Digital', 'Omron', 'devices', 'Device', 'ডিভাইস', NULL, '১ পিস', NULL, 2650.00, 3200.00, 120, 15, 0, 1, '/uploads/product-images/bp-monitor/box/bp-monitor.svg', '/uploads/product-images/bp-monitor/box/bp-monitor.svg', '🩸', 'ডিজিটাল ব্লাড প্রেসার মেশিন (Digital BP Monitor) — Device। Omron কর্তৃক উৎপাদিত ডিভাইস। ১ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'ডিজিটাল ব্লাড প্রেসার মেশিন (Digital BP Monitor) — Device। Omron কর্তৃক উৎপাদিত ডিভাইস। ১ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.70, 190, '2026-09-22 12:54:51.580', '2026-09-22 12:54:51.580'),
('c98ee73e-af58-45ae-a6a2-33cb885254e3', 'Napa 500mg', 'Napa 500mg', NULL, 'Beximco', 'medicine', 'Paracetamol', 'Tablet', '500mg', NULL, NULL, 1.75, 2.00, 107, 10, 0, 1, '/uploads/product-images/c98ee73e-af58-45ae-a6a2-33cb885254e3/box/195d63aa-4ab9-4159-abde-852ae7b6bdcc.png', NULL, NULL, 'Pain and fever relief', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 1, '2026-09-21 10:05:25.658', '2026-09-21 19:53:08.288'),
('calcium-d', 'ক্যালসিয়াম + ভিটামিন ডি৩', 'Calcium + Vit D3', 'Calcium', 'Renata', 'supplement', 'Calcium Carbonate', 'ট্যাবলেট', NULL, '৩০ পিস', NULL, 320.00, 400.00, 120, 15, 0, 1, '/uploads/product-images/calcium-d/box/calcium-d.svg', '/uploads/product-images/calcium-d/box/calcium-d.svg', '🦴', 'ক্যালসিয়াম + ভিটামিন ডি৩ (Calcium + Vit D3) — Calcium Carbonate। Renata কর্তৃক উৎপাদিত ট্যাবলেট। ৩০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'ক্যালসিয়াম + ভিটামিন ডি৩ (Calcium + Vit D3) — Calcium Carbonate। Renata কর্তৃক উৎপাদিত ট্যাবলেট। ৩০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.40, 97, '2026-09-22 12:54:51.611', '2026-09-22 12:54:51.611'),
('cetaphil', 'সিটাফিল জেন্টল স্কিন ক্লিনজার ১২৫ মি.লি.', 'Cetaphil Gentle Cleanser', 'Cetaphil', 'Cetaphil', 'beauty', 'Skin Care', 'লিকুইড', NULL, '১২৫ মি.লি.', NULL, 780.00, 950.00, 120, 15, 0, 1, '/uploads/product-images/cetaphil/box/cetaphil.svg', '/uploads/product-images/cetaphil/box/cetaphil.svg', '🧴', 'সিটাফিল জেন্টল স্কিন ক্লিনজার ১২৫ মি.লি. (Cetaphil Gentle Cleanser) — Skin Care। Cetaphil কর্তৃক উৎপাদিত লিকুইড। ১২৫ মি.লি. প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'সিটাফিল জেন্টল স্কিন ক্লিনজার ১২৫ মি.লি. (Cetaphil Gentle Cleanser) — Skin Care। Cetaphil কর্তৃক উৎপাদিত লিকুইড। ১২৫ মি.লি. প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.80, 410, '2026-09-22 12:54:51.620', '2026-09-22 12:54:51.620'),
('condom-pack', 'কনডম আল্ট্রা থিন (১২ পিস)', 'Ultra Thin Condom', 'Ultra', 'Durex', 'sexual-wellness', 'Contraceptive', 'প্যাক', NULL, '১২ পিস', NULL, 480.00, 600.00, 120, 15, 0, 1, '/uploads/product-images/condom-pack/box/condom-pack.svg', '/uploads/product-images/condom-pack/box/condom-pack.svg', '❤️', 'কনডম আল্ট্রা থিন (১২ পিস) (Ultra Thin Condom) — Contraceptive। Durex কর্তৃক উৎপাদিত প্যাক। ১২ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'কনডম আল্ট্রা থিন (১২ পিস) (Ultra Thin Condom) — Contraceptive। Durex কর্তৃক উৎপাদিত প্যাক। ১২ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.60, 320, '2026-09-22 12:54:51.668', '2026-09-22 12:54:51.668'),
('cotton-roll', 'কটন রোল ১০০ গ্রাম', 'Cotton Roll 100g', 'Cotton', 'Medico', 'healthcare', 'Cotton', 'রোল', NULL, '১০০ গ্রাম', NULL, 75.00, 95.00, 120, 15, 0, 1, '/uploads/product-images/cotton-roll/box/cotton-roll.svg', '/uploads/product-images/cotton-roll/box/cotton-roll.svg', '🧻', 'কটন রোল ১০০ গ্রাম (Cotton Roll 100g) — Cotton। Medico কর্তৃক উৎপাদিত রোল। ১০০ গ্রাম প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'কটন রোল ১০০ গ্রাম (Cotton Roll 100g) — Cotton। Medico কর্তৃক উৎপাদিত রোল। ১০০ গ্রাম প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.00, 33, '2026-09-22 12:54:51.738', '2026-09-22 12:54:51.738'),
('diabetic-atta', 'ডায়াবেটিক আটা ১ কেজি', 'Diabetic Atta 1kg', 'Diabetic', 'Teer', 'food', 'Food', 'আটা', NULL, '১ কেজি', NULL, 190.00, 230.00, 120, 15, 0, 1, '/uploads/product-images/diabetic-atta/box/diabetic-atta.svg', '/uploads/product-images/diabetic-atta/box/diabetic-atta.svg', '🌾', 'ডায়াবেটিক আটা ১ কেজি (Diabetic Atta 1kg) — Food। Teer কর্তৃক উৎপাদিত আটা। ১ কেজি প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'ডায়াবেটিক আটা ১ কেজি (Diabetic Atta 1kg) — Food। Teer কর্তৃক উৎপাদিত আটা। ১ কেজি প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.10, 39, '2026-09-22 12:54:51.721', '2026-09-22 12:54:51.721'),
('fexo-120', 'ফেক্সো ১২০ মিগ্রা', 'Fexo 120mg', 'Fexo', 'Square', 'medicine', 'Fexofenadine', 'ট্যাবলেট', NULL, '১০ পিস', NULL, 90.00, 100.00, 120, 15, 0, 1, '/uploads/product-images/fexo-120/box/fexo-120.svg', '/uploads/product-images/fexo-120/box/fexo-120.svg', '💊', 'ফেক্সো ১২০ মিগ্রা (Fexo 120mg) — Fexofenadine। Square কর্তৃক উৎপাদিত ট্যাবলেট। ১০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'ফেক্সো ১২০ মিগ্রা (Fexo 120mg) — Fexofenadine। Square কর্তৃক উৎপাদিত ট্যাবলেট। ১০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.60, 210, '2026-09-22 12:54:51.557', '2026-09-22 12:54:51.557'),
('first-aid', 'ফার্স্ট এইড বক্স', 'First Aid Box', 'First', 'Medico', 'healthcare', 'First Aid', 'বক্স', NULL, '১ সেট', NULL, 690.00, 850.00, 120, 15, 0, 1, '/uploads/product-images/first-aid/box/first-aid.svg', '/uploads/product-images/first-aid/box/first-aid.svg', '🧰', 'ফার্স্ট এইড বক্স (First Aid Box) — First Aid। Medico কর্তৃক উৎপাদিত বক্স। ১ সেট প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'ফার্স্ট এইড বক্স (First Aid Box) — First Aid। Medico কর্তৃক উৎপাদিত বক্স। ১ সেট প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.30, 58, '2026-09-22 12:54:51.729', '2026-09-22 12:54:51.729'),
('floor-cleaner', 'ফ্লোর ডিসইনফেক্ট্যান্ট ১ লিটার', 'Floor Disinfectant 1L', 'Floor', 'Harpic', 'homecare', 'Disinfectant', 'লিকুইড', NULL, '১ লিটার', NULL, 340.00, 400.00, 120, 15, 0, 1, '/uploads/product-images/floor-cleaner/box/floor-cleaner.svg', '/uploads/product-images/floor-cleaner/box/floor-cleaner.svg', '🧽', 'ফ্লোর ডিসইনফেক্ট্যান্ট ১ লিটার (Floor Disinfectant 1L) — Disinfectant। Harpic কর্তৃক উৎপাদিত লিকুইড। ১ লিটার প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'ফ্লোর ডিসইনফেক্ট্যান্ট ১ লিটার (Floor Disinfectant 1L) — Disinfectant। Harpic কর্তৃক উৎপাদিত লিকুইড। ১ লিটার প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.10, 60, '2026-09-22 12:54:51.664', '2026-09-22 12:54:51.664'),
('glucometer', 'গ্লুকোমিটার ফুল কিট', 'Glucometer Full Kit', 'Glucometer', 'Accu-Chek', 'devices', 'Device', 'ডিভাইস', NULL, '১ কিট', NULL, 1750.00, 2100.00, 120, 15, 0, 1, '/uploads/product-images/glucometer/box/glucometer.svg', '/uploads/product-images/glucometer/box/glucometer.svg', '🩺', 'গ্লুকোমিটার ফুল কিট (Glucometer Full Kit) — Device। Accu-Chek কর্তৃক উৎপাদিত ডিভাইস। ১ কিট প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'গ্লুকোমিটার ফুল কিট (Glucometer Full Kit) — Device। Accu-Chek কর্তৃক উৎপাদিত ডিভাইস। ১ কিট প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.60, 143, '2026-09-22 12:54:51.584', '2026-09-22 12:54:51.584'),
('hair-oil', 'হেয়ার ফল কন্ট্রোল অয়েল', 'Hair Fall Control Oil', 'Hair', 'Herbal Bd', 'beauty', 'Hair Care', 'অয়েল', NULL, '২০০ মি.লি.', NULL, 420.00, 520.00, 120, 15, 0, 1, '/uploads/product-images/hair-oil/box/hair-oil.svg', '/uploads/product-images/hair-oil/box/hair-oil.svg', '💇', 'হেয়ার ফল কন্ট্রোল অয়েল (Hair Fall Control Oil) — Hair Care। Herbal Bd কর্তৃক উৎপাদিত অয়েল। ২০০ মি.লি. প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'হেয়ার ফল কন্ট্রোল অয়েল (Hair Fall Control Oil) — Hair Care। Herbal Bd কর্তৃক উৎপাদিত অয়েল। ২০০ মি.লি. প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.20, 55, '2026-09-22 12:54:51.633', '2026-09-22 12:54:51.633'),
('hand-sanitizer', 'হ্যান্ড স্যানিটাইজার ৫০০ মি.লি.', 'Hand Sanitizer 500ml', 'Hand', 'Savlon', 'homecare', 'Antiseptic', 'লিকুইড', NULL, '৫০০ মি.লি.', NULL, 250.00, 320.00, 120, 15, 0, 1, '/uploads/product-images/hand-sanitizer/box/hand-sanitizer.svg', '/uploads/product-images/hand-sanitizer/box/hand-sanitizer.svg', '🧼', 'হ্যান্ড স্যানিটাইজার ৫০০ মি.লি. (Hand Sanitizer 500ml) — Antiseptic। Savlon কর্তৃক উৎপাদিত লিকুইড। ৫০০ মি.লি. প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'হ্যান্ড স্যানিটাইজার ৫০০ মি.লি. (Hand Sanitizer 500ml) — Antiseptic। Savlon কর্তৃক উৎপাদিত লিকুইড। ৫০০ মি.লি. প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.40, 140, '2026-09-22 12:54:51.657', '2026-09-22 12:54:51.657'),
('infant-formula', 'ইনফ্যান্ট ফর্মুলা মিল্ক (০-৬ মাস)', 'Infant Formula Milk', 'Infant', 'Nan Pro', 'baby-mom', 'Nutrition', 'পাউডার', NULL, '৪০০ গ্রাম', NULL, 1450.00, 1650.00, 120, 15, 0, 1, '/uploads/product-images/infant-formula/box/infant-formula.svg', '/uploads/product-images/infant-formula/box/infant-formula.svg', '🥛', 'ইনফ্যান্ট ফর্মুলা মিল্ক (০-৬ মাস) (Infant Formula Milk) — Nutrition। Nan Pro কর্তৃক উৎপাদিত পাউডার। ৪০০ গ্রাম প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'ইনফ্যান্ট ফর্মুলা মিল্ক (০-৬ মাস) (Infant Formula Milk) — Nutrition। Nan Pro কর্তৃক উৎপাদিত পাউডার। ৪০০ গ্রাম প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.50, 205, '2026-09-22 12:54:51.653', '2026-09-22 12:54:51.653'),
('losectil-20', 'লোসেকটিল ২০ মিগ্রা', 'Losectil 20mg', 'Losectil', 'Eskayef', 'medicine', 'Omeprazole', 'ক্যাপসুল', NULL, '১০ পিস', NULL, 38.00, 45.00, 120, 15, 0, 1, '/uploads/product-images/losectil-20/box/losectil-20.svg', '/uploads/product-images/losectil-20/box/losectil-20.svg', '💊', 'লোসেকটিল ২০ মিগ্রা (Losectil 20mg) — Omeprazole। Eskayef কর্তৃক উৎপাদিত ক্যাপসুল। ১০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'লোসেকটিল ২০ মিগ্রা (Losectil 20mg) — Omeprazole। Eskayef কর্তৃক উৎপাদিত ক্যাপসুল। ১০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.30, 51, '2026-09-22 12:54:51.575', '2026-09-22 12:54:51.575'),
('maxpro-20', 'ম্যাক্সপ্রো ২০ মিগ্রা', 'Maxpro 20mg', 'Maxpro', 'Renata', 'medicine', 'Esomeprazole', 'ক্যাপসুল', NULL, '১০ পিস', NULL, 70.00, 80.00, 120, 15, 0, 1, '/uploads/product-images/maxpro-20/box/maxpro-20.svg', '/uploads/product-images/maxpro-20/box/maxpro-20.svg', '💊', 'ম্যাক্সপ্রো ২০ মিগ্রা (Maxpro 20mg) — Esomeprazole। Renata কর্তৃক উৎপাদিত ক্যাপসুল। ১০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'ম্যাক্সপ্রো ২০ মিগ্রা (Maxpro 20mg) — Esomeprazole। Renata কর্তৃক উৎপাদিত ক্যাপসুল। ১০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.40, 90, '2026-09-22 12:54:51.566', '2026-09-22 12:54:51.566'),
('monas-10', 'মোনাস ১০ মিগ্রা', 'Monas 10mg', 'Monas', 'Acme', 'medicine', 'Montelukast', 'ট্যাবলেট', NULL, '১০ পিস', NULL, 130.00, 150.00, 120, 15, 1, 1, '/uploads/product-images/monas-10/box/monas-10.svg', '/uploads/product-images/monas-10/box/monas-10.svg', '💊', 'মোনাস ১০ মিগ্রা (Monas 10mg) — Montelukast। Acme কর্তৃক উৎপাদিত ট্যাবলেট। ১০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'মোনাস ১০ মিগ্রা (Monas 10mg) — Montelukast। Acme কর্তৃক উৎপাদিত ট্যাবলেট। ১০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.50, 120, '2026-09-22 12:54:51.552', '2026-09-22 12:54:51.552'),
('napa-extra', 'নাপা এক্সট্রা ৫০০ মিগ্রা', 'Napa Extra 500mg', 'Napa', 'Beximco', 'medicine', 'Paracetamol + Caffeine', 'ট্যাবলেট', NULL, '১০ পিস', NULL, 30.00, 36.00, 120, 15, 0, 1, '/uploads/product-images/napa-extra/box/napa-extra.svg', '/uploads/product-images/napa-extra/box/napa-extra.svg', '💊', 'নাপা এক্সট্রা ৫০০ মিগ্রা (Napa Extra 500mg) — Paracetamol + Caffeine। Beximco কর্তৃক উৎপাদিত ট্যাবলেট। ১০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'নাপা এক্সট্রা ৫০০ মিগ্রা (Napa Extra 500mg) — Paracetamol + Caffeine। Beximco কর্তৃক উৎপাদিত ট্যাবলেট। ১০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.80, 512, '2026-09-22 12:54:51.541', '2026-09-22 12:54:51.541'),
('omega-3', 'ওমেগা-৩ ফিশ অয়েল ১০০০ মিগ্রা', 'Omega-3 Fish Oil', 'Omega-3', 'NatureBell', 'supplement', 'Fish Oil', 'ক্যাপসুল', NULL, '৬০ পিস', NULL, 1290.00, 1890.00, 120, 15, 0, 1, '/uploads/product-images/omega-3/box/omega-3.svg', '/uploads/product-images/omega-3/box/omega-3.svg', '🐟', 'ওমেগা-৩ ফিশ অয়েল ১০০০ মিগ্রা (Omega-3 Fish Oil) — Fish Oil। NatureBell কর্তৃক উৎপাদিত ক্যাপসুল। ৬০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'ওমেগা-৩ ফিশ অয়েল ১০০০ মিগ্রা (Omega-3 Fish Oil) — Fish Oil। NatureBell কর্তৃক উৎপাদিত ক্যাপসুল। ৬০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.50, 132, '2026-09-22 12:54:51.602', '2026-09-22 12:54:51.602'),
('pet-shampoo', 'পেট শ্যাম্পু ২০০ মি.লি.', 'Pet Shampoo 200ml', 'Pet', 'PetCare', 'pet-care', 'Pet', 'শ্যাম্পু', NULL, '২০০ মি.লি.', NULL, 390.00, 480.00, 120, 15, 0, 1, '/uploads/product-images/pet-shampoo/box/pet-shampoo.svg', '/uploads/product-images/pet-shampoo/box/pet-shampoo.svg', '🐾', 'পেট শ্যাম্পু ২০০ মি.লি. (Pet Shampoo 200ml) — Pet। PetCare কর্তৃক উৎপাদিত শ্যাম্পু। ২০০ মি.লি. প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'পেট শ্যাম্পু ২০০ মি.লি. (Pet Shampoo 200ml) — Pet। PetCare কর্তৃক উৎপাদিত শ্যাম্পু। ২০০ মি.লি. প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.20, 27, '2026-09-22 12:54:51.745', '2026-09-22 12:54:51.745'),
('preg-test', 'প্রেগন্যান্সি টেস্ট কিট', 'Pregnancy Test Kit', 'Pregnancy', 'Bioline', 'sexual-wellness', 'Diagnostic', 'কিট', NULL, '১ পিস', NULL, 90.00, 120.00, 120, 15, 0, 1, '/uploads/product-images/preg-test/box/preg-test.svg', '/uploads/product-images/preg-test/box/preg-test.svg', '🧪', 'প্রেগন্যান্সি টেস্ট কিট (Pregnancy Test Kit) — Diagnostic। Bioline কর্তৃক উৎপাদিত কিট। ১ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'প্রেগন্যান্সি টেস্ট কিট (Pregnancy Test Kit) — Diagnostic। Bioline কর্তৃক উৎপাদিত কিট। ১ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.30, 150, '2026-09-22 12:54:51.673', '2026-09-22 12:54:51.673'),
('protein-powder', 'হোয়ে প্রোটিন পাউডার ১ কেজি', 'Whey Protein 1kg', 'Whey', 'Optimum', 'food', 'Protein', 'পাউডার', NULL, '১ কেজি', NULL, 4200.00, 5200.00, 120, 15, 0, 1, '/uploads/product-images/protein-powder/box/protein-powder.svg', '/uploads/product-images/protein-powder/box/protein-powder.svg', '🥤', 'হোয়ে প্রোটিন পাউডার ১ কেজি (Whey Protein 1kg) — Protein। Optimum কর্তৃক উৎপাদিত পাউডার। ১ কেজি প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'হোয়ে প্রোটিন পাউডার ১ কেজি (Whey Protein 1kg) — Protein। Optimum কর্তৃক উৎপাদিত পাউডার। ১ কেজি প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.70, 260, '2026-09-22 12:54:51.726', '2026-09-22 12:54:51.726'),
('pulse-oximeter', 'পালস অক্সিমিটার', 'Pulse Oximeter', 'Pulse', 'Yuwell', 'devices', 'Device', 'ডিভাইস', NULL, '১ পিস', NULL, 1150.00, 1500.00, 120, 15, 0, 1, '/uploads/product-images/pulse-oximeter/box/pulse-oximeter.svg', '/uploads/product-images/pulse-oximeter/box/pulse-oximeter.svg', '📟', 'পালস অক্সিমিটার (Pulse Oximeter) — Device। Yuwell কর্তৃক উৎপাদিত ডিভাইস। ১ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'পালস অক্সিমিটার (Pulse Oximeter) — Device। Yuwell কর্তৃক উৎপাদিত ডিভাইস। ১ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.40, 74, '2026-09-22 12:54:51.593', '2026-09-22 12:54:51.593'),
('seclo-20', 'সেকলো ২০ মিগ্রা', 'Seclo 20mg', 'Seclo', 'Square', 'medicine', 'Omeprazole', 'ক্যাপসুল', NULL, '১০ পিস', NULL, 42.00, 50.00, 120, 15, 0, 1, '/uploads/product-images/seclo-20/box/seclo-20.svg', '/uploads/product-images/seclo-20/box/seclo-20.svg', '💊', 'সেকলো ২০ মিগ্রা (Seclo 20mg) — Omeprazole। Square কর্তৃক উৎপাদিত ক্যাপসুল। ১০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'সেকলো ২০ মিগ্রা (Seclo 20mg) — Omeprazole। Square কর্তৃক উৎপাদিত ক্যাপসুল। ১০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.70, 340, '2026-09-22 12:54:51.547', '2026-09-22 12:54:51.547'),
('sergel-20', 'সার্জেল ২০ মিগ্রা', 'Sergel 20mg', 'Sergel', 'Healthcare', 'medicine', 'Esomeprazole', 'ক্যাপসুল', NULL, '১৪ পিস', NULL, 98.00, 112.00, 120, 15, 0, 1, '/uploads/product-images/sergel-20/box/sergel-20.svg', '/uploads/product-images/sergel-20/box/sergel-20.svg', '💊', 'সার্জেল ২০ মিগ্রা (Sergel 20mg) — Esomeprazole। Healthcare কর্তৃক উৎপাদিত ক্যাপসুল। ১৪ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'সার্জেল ২০ মিগ্রা (Sergel 20mg) — Esomeprazole। Healthcare কর্তৃক উৎপাদিত ক্যাপসুল। ১৪ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.70, 430, '2026-09-22 12:54:51.562', '2026-09-22 12:54:51.562'),
('sunscreen-50', 'সানস্ক্রিন SPF ৫০+', 'Sunscreen SPF 50+', 'Sunscreen', 'Skin\'O', 'beauty', 'Sun Care', 'ক্রিম', NULL, '৫০ গ্রাম', NULL, 640.00, 800.00, 120, 15, 0, 1, '/uploads/product-images/sunscreen-50/box/sunscreen-50.svg', '/uploads/product-images/sunscreen-50/box/sunscreen-50.svg', '☀️', 'সানস্ক্রিন SPF ৫০+ (Sunscreen SPF 50+) — Sun Care। Skin\'O কর্তৃক উৎপাদিত ক্রিম। ৫০ গ্রাম প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'সানস্ক্রিন SPF ৫০+ (Sunscreen SPF 50+) — Sun Care। Skin\'O কর্তৃক উৎপাদিত ক্রিম। ৫০ গ্রাম প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.60, 220, '2026-09-22 12:54:51.624', '2026-09-22 12:54:51.624'),
('surgical-mask', 'সার্জিক্যাল মাস্ক (৫০ পিস)', 'Surgical Mask 50pcs', 'Surgical', 'Medico', 'healthcare', 'Mask', 'বক্স', NULL, '৫০ পিস', NULL, 180.00, 250.00, 120, 15, 0, 1, '/uploads/product-images/surgical-mask/box/surgical-mask.svg', '/uploads/product-images/surgical-mask/box/surgical-mask.svg', '😷', 'সার্জিক্যাল মাস্ক (৫০ পিস) (Surgical Mask 50pcs) — Mask। Medico কর্তৃক উৎপাদিত বক্স। ৫০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'সার্জিক্যাল মাস্ক (৫০ পিস) (Surgical Mask 50pcs) — Mask। Medico কর্তৃক উৎপাদিত বক্স। ৫০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.20, 410, '2026-09-22 12:54:51.733', '2026-09-22 12:54:51.733'),
('thermometer', 'ডিজিটাল থার্মোমিটার', 'Digital Thermometer', 'Digital', 'Dr. Care', 'devices', 'Device', 'ডিভাইস', NULL, '১ পিস', NULL, 220.00, 300.00, 120, 15, 0, 1, '/uploads/product-images/thermometer/box/thermometer.svg', '/uploads/product-images/thermometer/box/thermometer.svg', '🌡️', 'ডিজিটাল থার্মোমিটার (Digital Thermometer) — Device। Dr. Care কর্তৃক উৎপাদিত ডিভাইস। ১ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'ডিজিটাল থার্মোমিটার (Digital Thermometer) — Device। Dr. Care কর্তৃক উৎপাদিত ডিভাইস। ১ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.20, 88, '2026-09-22 12:54:51.588', '2026-09-22 12:54:51.588'),
('tulsi-syrup', 'তুলসী কফ সিরাপ ১০০ মি.লি.', 'Tulsi Cough Syrup', 'Tulsi', 'Hamdard', 'herbal', 'Herbal', 'সিরাপ', NULL, '১০০ মি.লি.', NULL, 160.00, 200.00, 120, 15, 0, 1, '/uploads/product-images/tulsi-syrup/box/tulsi-syrup.svg', '/uploads/product-images/tulsi-syrup/box/tulsi-syrup.svg', '🌿', 'তুলসী কফ সিরাপ ১০০ মি.লি. (Tulsi Cough Syrup) — Herbal। Hamdard কর্তৃক উৎপাদিত সিরাপ। ১০০ মি.লি. প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'তুলসী কফ সিরাপ ১০০ মি.লি. (Tulsi Cough Syrup) — Herbal। Hamdard কর্তৃক উৎপাদিত সিরাপ। ১০০ মি.লি. প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.20, 70, '2026-09-22 12:54:51.683', '2026-09-22 12:54:51.683'),
('vit-c', 'ভিটামিন সি ২৫০ মিগ্রা', 'Vitamin C 250mg', 'Vitamin', 'Square', 'supplement', 'Ascorbic Acid', 'ট্যাবলেট', NULL, '২০ পিস', NULL, 60.00, 72.00, 120, 15, 0, 1, '/uploads/product-images/vit-c/box/vit-c.svg', '/uploads/product-images/vit-c/box/vit-c.svg', '🟠', 'ভিটামিন সি ২৫০ মিগ্রা (Vitamin C 250mg) — Ascorbic Acid। Square কর্তৃক উৎপাদিত ট্যাবলেট। ২০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'ভিটামিন সি ২৫০ মিগ্রা (Vitamin C 250mg) — Ascorbic Acid। Square কর্তৃক উৎপাদিত ট্যাবলেট। ২০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.60, 260, '2026-09-22 12:54:51.598', '2026-09-22 12:54:51.598'),
('zinc-b', 'জিংক ও বি-কমপ্লেক্স', 'Zinc & B-Complex', 'Zinc', 'Acme', 'supplement', 'Zinc Sulphate', 'ট্যাবলেট', NULL, '৩০ পিস', NULL, 180.00, 220.00, 120, 15, 0, 1, '/uploads/product-images/zinc-b/box/zinc-b.svg', '/uploads/product-images/zinc-b/box/zinc-b.svg', '🟡', 'জিংক ও বি-কমপ্লেক্স (Zinc & B-Complex) — Zinc Sulphate। Acme কর্তৃক উৎপাদিত ট্যাবলেট। ৩০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', 'জিংক ও বি-কমপ্লেক্স (Zinc & B-Complex) — Zinc Sulphate। Acme কর্তৃক উৎপাদিত ট্যাবলেট। ৩০ পিস প্যাকে সরবরাহ করা হয়। ১০০% অরিজিনাল পণ্য, DGDA অনুমোদিত সরবরাহকারীর কাছ থেকে সংগৃহীত।', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4.30, 62, '2026-09-22 12:54:51.615', '2026-09-22 12:54:51.615');

-- --------------------------------------------------------

--
-- Table structure for table `product_image_audit`
--

CREATE TABLE `product_image_audit` (
  `product_id` varchar(64) NOT NULL,
  `product_name` varchar(512) NOT NULL DEFAULT '',
  `box_url` varchar(2048) NOT NULL DEFAULT '',
  `medicine_url` varchar(2048) NOT NULL DEFAULT '',
  `status` varchar(64) NOT NULL DEFAULT 'unknown',
  `source` varchar(128) NOT NULL DEFAULT '',
  `note` text NOT NULL,
  `http_status` int(11) DEFAULT NULL,
  `checked_at` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_image_map`
--

CREATE TABLE `product_image_map` (
  `id` varchar(36) NOT NULL,
  `product_id` varchar(64) NOT NULL,
  `url` varchar(2048) NOT NULL DEFAULT '',
  `medicine_url` varchar(2048) NOT NULL DEFAULT '',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_reviews`
--

CREATE TABLE `product_reviews` (
  `id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `author_name` varchar(255) DEFAULT NULL,
  `rating` int(11) NOT NULL DEFAULT 5,
  `comment` text DEFAULT NULL,
  `verified` tinyint(1) NOT NULL DEFAULT 0,
  `status` varchar(64) NOT NULL DEFAULT 'pending',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `product_reviews`
--

INSERT INTO `product_reviews` (`id`, `product_id`, `user_id`, `author_name`, `rating`, `comment`, `verified`, `status`, `created_at`, `updated_at`) VALUES
('82d75a8f-69b1-4bc9-8109-0cefc3c80c90', 'c98ee73e-af58-45ae-a6a2-33cb885254e3', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'Super Admin', 5, 'smoke review', 0, 'approved', '2026-09-21 16:04:29.309', '2026-09-21 16:04:29.380');

-- --------------------------------------------------------

--
-- Table structure for table `profiles`
--

CREATE TABLE `profiles` (
  `id` varchar(36) NOT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `phone` varchar(32) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `profiles`
--

INSERT INTO `profiles` (`id`, `full_name`, `phone`, `address`, `created_at`, `updated_at`) VALUES
('cust-staff-test-001', 'Test Customer', '01811111111', NULL, '2026-09-21 16:43:03.986', '2026-09-21 16:43:03.986'),
('dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'Super Admin', '01700000000', NULL, '2026-09-21 10:05:25.645', '2026-09-21 10:05:25.645');

-- --------------------------------------------------------

--
-- Table structure for table `purchase_orders`
--

CREATE TABLE `purchase_orders` (
  `id` varchar(36) NOT NULL,
  `po_no` varchar(64) NOT NULL,
  `supplier_id` varchar(36) NOT NULL,
  `supplier_name` varchar(255) NOT NULL DEFAULT '',
  `status` varchar(64) NOT NULL DEFAULT 'ordered',
  `expected_at` datetime(3) DEFAULT NULL,
  `subtotal` decimal(12,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `note` text DEFAULT NULL,
  `received_at` datetime(3) DEFAULT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `purchase_orders`
--

INSERT INTO `purchase_orders` (`id`, `po_no`, `supplier_id`, `supplier_name`, `status`, `expected_at`, `subtotal`, `discount`, `total`, `note`, `received_at`, `created_by`, `created_at`, `updated_at`) VALUES
('3a7fd9c9-7152-4413-99ec-54ca2e00a4c6', 'PO-260921-3A7FD', 'b0acc627-445a-48f4-a389-723aff83a6da', 'ERP Smoke Supplier', 'received', NULL, 62.50, 0.00, 62.50, NULL, '2026-09-21 13:15:19.242', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', '2026-09-21 19:15:19.184', '2026-09-21 19:15:19.251'),
('8dca4c4a-d07d-4133-98c5-205bb29b9dad', 'PO-260921-8DCA4', 'b0acc627-445a-48f4-a389-723aff83a6da', 'ERP Smoke Supplier', 'received', NULL, 5.00, 0.00, 5.00, NULL, '2026-09-21 06:20:20.559', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', '2026-09-21 12:20:20.493', '2026-09-21 12:20:20.563');

-- --------------------------------------------------------

--
-- Table structure for table `purchase_order_items`
--

CREATE TABLE `purchase_order_items` (
  `id` varchar(36) NOT NULL,
  `po_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `product_name` varchar(512) NOT NULL DEFAULT '',
  `qty` int(11) NOT NULL DEFAULT 0,
  `received_qty` int(11) NOT NULL DEFAULT 0,
  `cost` decimal(12,2) NOT NULL DEFAULT 0.00,
  `batch_no` varchar(128) NOT NULL DEFAULT '',
  `expiry` varchar(32) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `purchase_order_items`
--

INSERT INTO `purchase_order_items` (`id`, `po_id`, `product_id`, `product_name`, `qty`, `received_qty`, `cost`, `batch_no`, `expiry`) VALUES
('52c30656-79e2-4e3e-bd01-202fb19e64e0', '3a7fd9c9-7152-4413-99ec-54ca2e00a4c6', 'c98ee73e-af58-45ae-a6a2-33cb885254e3', 'Napa 500mg', 5, 5, 12.50, 'BATCH-SMOKE-1', '2027-06-30'),
('8da030d7-6eba-4d99-9fcd-649931039db0', '8dca4c4a-d07d-4133-98c5-205bb29b9dad', 'c98ee73e-af58-45ae-a6a2-33cb885254e3', 'Napa 500mg', 5, 5, 1.00, '', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `refill_reminders`
--

CREATE TABLE `refill_reminders` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `product_id` varchar(64) NOT NULL,
  `product_name` varchar(512) NOT NULL,
  `every_days` int(11) NOT NULL DEFAULT 30,
  `next_at` date NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `last_notified_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `riders`
--

CREATE TABLE `riders` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `name` varchar(255) NOT NULL DEFAULT '',
  `phone` varchar(32) NOT NULL DEFAULT '',
  `vehicle` varchar(64) NOT NULL DEFAULT 'bike',
  `zone` varchar(128) NOT NULL DEFAULT '',
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `last_lat` decimal(10,7) DEFAULT NULL,
  `last_lng` decimal(10,7) DEFAULT NULL,
  `last_seen_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `riders`
--

INSERT INTO `riders` (`id`, `user_id`, `name`, `phone`, `vehicle`, `zone`, `active`, `last_lat`, `last_lng`, `last_seen_at`, `created_at`, `updated_at`) VALUES
('d32fec6b-a4f0-46da-90f7-7e18a31a0efe', NULL, 'Smoke Rider', '01800000000', 'bike', 'Dhanmondi', 1, 23.8100000, 90.4100000, '2026-09-21 06:20:20.775', '2026-09-21 12:20:20.692', '2026-09-21 12:20:20.775');

-- --------------------------------------------------------

--
-- Table structure for table `rx_retention`
--

CREATE TABLE `rx_retention` (
  `user_id` varchar(36) NOT NULL,
  `days` int(11) NOT NULL DEFAULT 365,
  `notify_email` tinyint(1) NOT NULL DEFAULT 0,
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `service_requests`
--

CREATE TABLE `service_requests` (
  `id` varchar(36) NOT NULL,
  `request_no` varchar(64) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `service_slug` varchar(120) NOT NULL DEFAULT '',
  `service_name` varchar(255) NOT NULL DEFAULT '',
  `patient_name` varchar(255) NOT NULL DEFAULT '',
  `phone` varchar(32) NOT NULL DEFAULT '',
  `address` text DEFAULT NULL,
  `scheduled_date` varchar(32) NOT NULL DEFAULT '',
  `slot` varchar(128) NOT NULL DEFAULT '',
  `fee` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` varchar(64) NOT NULL DEFAULT 'requested',
  `note` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `service_requests`
--

INSERT INTO `service_requests` (`id`, `request_no`, `user_id`, `service_slug`, `service_name`, `patient_name`, `phone`, `address`, `scheduled_date`, `slot`, `fee`, `status`, `note`, `created_at`, `updated_at`) VALUES
('43439db7-f9d3-4756-9177-c04f5a43eb6c', 'HS-SMOKE1', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'home-nursing', 'Home Nursing', 'Smoke Patient', '01711111111', 'Dhaka', '', '', 800.00, 'requested', NULL, '2026-09-21 15:26:06.296', '2026-09-21 15:26:06.296');

-- --------------------------------------------------------

--
-- Table structure for table `stock_adjustments`
--

CREATE TABLE `stock_adjustments` (
  `id` varchar(36) NOT NULL,
  `adj_no` varchar(64) NOT NULL,
  `reason` varchar(64) NOT NULL DEFAULT 'correction',
  `note` text NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'applied',
  `branch_id` varchar(36) DEFAULT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `stock_adjustments`
--

INSERT INTO `stock_adjustments` (`id`, `adj_no`, `reason`, `note`, `status`, `branch_id`, `created_by`, `created_at`, `updated_at`) VALUES
('94b8feda-7f7a-49b9-bdcc-081d6741fa7e', 'ADJ-260921-94B8F', 'damage', 'smoke test', 'applied', NULL, 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', '2026-09-21 19:53:08.283', '2026-09-21 19:53:08.283');

-- --------------------------------------------------------

--
-- Table structure for table `stock_adjustment_items`
--

CREATE TABLE `stock_adjustment_items` (
  `id` varchar(36) NOT NULL,
  `adj_id` varchar(36) NOT NULL,
  `product_id` varchar(64) NOT NULL,
  `product_name` varchar(512) NOT NULL DEFAULT '',
  `change` int(11) NOT NULL DEFAULT 0,
  `before_qty` int(11) NOT NULL DEFAULT 0,
  `after_qty` int(11) NOT NULL DEFAULT 0,
  `note` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `stock_adjustment_items`
--

INSERT INTO `stock_adjustment_items` (`id`, `adj_id`, `product_id`, `product_name`, `change`, `before_qty`, `after_qty`, `note`) VALUES
('2963d287-9d87-4080-9c82-11133edf59ce', '94b8feda-7f7a-49b9-bdcc-081d6741fa7e', 'c98ee73e-af58-45ae-a6a2-33cb885254e3', 'Napa 500mg', -1, 108, 107, '');

-- --------------------------------------------------------

--
-- Table structure for table `stock_alerts`
--

CREATE TABLE `stock_alerts` (
  `id` varchar(36) NOT NULL,
  `kind` varchar(64) NOT NULL,
  `ref` varchar(255) NOT NULL DEFAULT '',
  `product_id` varchar(36) NOT NULL DEFAULT '',
  `product_name` varchar(512) NOT NULL DEFAULT '',
  `detail` text NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_batches`
--

CREATE TABLE `stock_batches` (
  `id` varchar(36) NOT NULL,
  `product_id` varchar(64) NOT NULL,
  `product_name` varchar(512) NOT NULL DEFAULT '',
  `batch_no` varchar(128) NOT NULL DEFAULT '',
  `expiry` date DEFAULT NULL,
  `qty` int(11) NOT NULL DEFAULT 0,
  `cost` decimal(12,2) NOT NULL DEFAULT 0.00,
  `supplier_id` varchar(36) DEFAULT NULL,
  `po_id` varchar(36) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `stock_batches`
--

INSERT INTO `stock_batches` (`id`, `product_id`, `product_name`, `batch_no`, `expiry`, `qty`, `cost`, `supplier_id`, `po_id`, `created_at`, `updated_at`) VALUES
('659da857-4126-4350-a4ac-b731fa9d5b60', 'c98ee73e-af58-45ae-a6a2-33cb885254e3', 'Napa 500mg', 'BATCH-SMOKE-1', '2027-06-30', 5, 12.50, 'b0acc627-445a-48f4-a389-723aff83a6da', '3a7fd9c9-7152-4413-99ec-54ca2e00a4c6', '2026-09-21 19:15:19.250', '2026-09-21 19:15:19.250');

-- --------------------------------------------------------

--
-- Table structure for table `stock_counts`
--

CREATE TABLE `stock_counts` (
  `id` varchar(36) NOT NULL,
  `count_no` varchar(64) NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'draft',
  `note` text NOT NULL,
  `branch_id` varchar(36) DEFAULT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `applied_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_count_items`
--

CREATE TABLE `stock_count_items` (
  `id` varchar(36) NOT NULL,
  `count_id` varchar(36) NOT NULL,
  `product_id` varchar(64) NOT NULL,
  `product_name` varchar(512) NOT NULL DEFAULT '',
  `system_qty` int(11) NOT NULL DEFAULT 0,
  `counted_qty` int(11) NOT NULL DEFAULT 0,
  `note` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stock_movements`
--

CREATE TABLE `stock_movements` (
  `id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `product_name` varchar(512) NOT NULL DEFAULT '',
  `change` int(11) NOT NULL,
  `balance` int(11) NOT NULL DEFAULT 0,
  `kind` varchar(64) NOT NULL DEFAULT 'adjust',
  `ref` varchar(128) NOT NULL DEFAULT '',
  `note` text DEFAULT NULL,
  `actor_id` varchar(36) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `stock_movements`
--

INSERT INTO `stock_movements` (`id`, `product_id`, `product_name`, `change`, `balance`, `kind`, `ref`, `note`, `actor_id`, `created_at`) VALUES
('1e2f2126-9771-4d92-a664-4f83af337f90', 'c98ee73e-af58-45ae-a6a2-33cb885254e3', 'Napa 500mg', 1, 101, 'adjust', '', 'erp-smoke', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', '2026-09-21 12:13:46.621'),
('231c3ab4-2dee-4d5e-a701-4eaf3d73d21b', 'c98ee73e-af58-45ae-a6a2-33cb885254e3', 'Napa 500mg', -1, 100, 'pos', 'POS-260921-782A6', 'POS sale', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', '2026-09-21 12:20:20.410'),
('2ecdf78d-954c-422b-b1e4-e06af24f49f5', 'c98ee73e-af58-45ae-a6a2-33cb885254e3', 'Napa 500mg', 5, 105, 'po_receive', 'PO-260921-8DCA4', 'Received PO PO-260921-8DCA4', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', '2026-09-21 12:20:20.562'),
('487cdddb-d01b-4830-b72b-4e6ddb6ad605', 'c98ee73e-af58-45ae-a6a2-33cb885254e3', 'Napa 500mg', -1, 107, 'adjust', 'ADJ-260921-94B8F', 'damage', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', '2026-09-21 19:53:08.290'),
('71d95c83-0a76-44d8-b44b-ec0d40cba498', 'c98ee73e-af58-45ae-a6a2-33cb885254e3', 'Napa 500mg', 5, 108, 'po_receive', 'PO-260921-3A7FD', 'Received PO PO-260921-3A7FD', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', '2026-09-21 19:15:19.249'),
('7b7c6037-d734-47a7-8de9-e50586adb8ce', 'c98ee73e-af58-45ae-a6a2-33cb885254e3', 'Napa 500mg', -2, 103, 'transfer', 'TR-260921-CWU7', 'ঢাকা প্রধান → চট্টগ্রাম', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', '2026-09-21 16:22:41.280');

-- --------------------------------------------------------

--
-- Table structure for table `stock_transfers`
--

CREATE TABLE `stock_transfers` (
  `id` varchar(36) NOT NULL,
  `transfer_no` varchar(64) NOT NULL,
  `from_branch_id` varchar(36) DEFAULT NULL,
  `to_branch_id` varchar(36) DEFAULT NULL,
  `from_branch_name` varchar(255) NOT NULL DEFAULT '',
  `to_branch_name` varchar(255) NOT NULL DEFAULT '',
  `status` varchar(64) NOT NULL DEFAULT 'draft',
  `note` text DEFAULT NULL,
  `created_by` varchar(36) DEFAULT NULL,
  `sent_at` datetime(3) DEFAULT NULL,
  `received_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `stock_transfers`
--

INSERT INTO `stock_transfers` (`id`, `transfer_no`, `from_branch_id`, `to_branch_id`, `from_branch_name`, `to_branch_name`, `status`, `note`, `created_by`, `sent_at`, `received_at`, `created_at`, `updated_at`) VALUES
('f4e5b014-0e06-456e-a7e6-f224d5098cba', 'TR-260921-CWU7', '0c79a0eb-f01c-44ce-9f8d-10077a4c4be4', '9528259f-aabe-454a-bf87-c47d3d8cb43e', 'ঢাকা প্রধান', 'চট্টগ্রাম', 'sent', NULL, 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', '2026-09-21 10:22:41.274', NULL, '2026-09-21 16:22:41.275', '2026-09-21 16:22:41.275');

-- --------------------------------------------------------

--
-- Table structure for table `stock_transfer_items`
--

CREATE TABLE `stock_transfer_items` (
  `id` varchar(36) NOT NULL,
  `transfer_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `product_name` varchar(512) NOT NULL DEFAULT '',
  `qty` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `stock_transfer_items`
--

INSERT INTO `stock_transfer_items` (`id`, `transfer_id`, `product_id`, `product_name`, `qty`) VALUES
('87f5d6c9-82fe-4909-ae64-60283be99cc8', 'f4e5b014-0e06-456e-a7e6-f224d5098cba', 'c98ee73e-af58-45ae-a6a2-33cb885254e3', 'Napa 500mg', 2);

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `contact_person` varchar(255) NOT NULL DEFAULT '',
  `phone` varchar(32) NOT NULL DEFAULT '',
  `email` varchar(255) NOT NULL DEFAULT '',
  `address` text DEFAULT NULL,
  `payment_terms` varchar(255) NOT NULL DEFAULT '',
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`id`, `name`, `contact_person`, `phone`, `email`, `address`, `payment_terms`, `active`, `created_at`, `updated_at`) VALUES
('b0acc627-445a-48f4-a389-723aff83a6da', 'ERP Smoke Supplier', 'Ali', '01700000000', '', NULL, '', 1, '2026-09-21 12:20:20.432', '2026-09-21 12:20:20.432');

-- --------------------------------------------------------

--
-- Table structure for table `support_conversations`
--

CREATE TABLE `support_conversations` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `title` varchar(255) NOT NULL DEFAULT '',
  `status` varchar(64) NOT NULL DEFAULT 'open',
  `agent_name` varchar(255) NOT NULL DEFAULT '',
  `agent_id` varchar(36) DEFAULT NULL,
  `last_message_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `unread_for_agent` int(11) NOT NULL DEFAULT 0,
  `unread_for_user` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  `agent_active` tinyint(1) NOT NULL DEFAULT 0,
  `agent_last_seen` datetime(3) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `support_conversations`
--

INSERT INTO `support_conversations` (`id`, `user_id`, `title`, `status`, `agent_name`, `agent_id`, `last_message_at`, `unread_for_agent`, `unread_for_user`, `created_at`, `updated_at`, `agent_active`, `agent_last_seen`) VALUES
('39931834-27b2-4366-b926-656d61878a18', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'Support', 'open', '', NULL, '2026-09-21 09:49:42.778', 1, 1, '2026-09-21 15:49:42.669', '2026-09-21 15:49:42.779', 0, NULL),
('b49d3eee-a160-40ad-9b2d-4b3d5b541b05', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'ERP smoke ticket', 'closed', 'Super Admin', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', '2026-09-21 06:13:46.757', 0, 1, '2026-09-21 12:12:52.683', '2026-09-21 12:13:46.824', 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `support_messages`
--

CREATE TABLE `support_messages` (
  `id` varchar(36) NOT NULL,
  `conversation_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `sender` varchar(32) NOT NULL DEFAULT 'user',
  `body` text NOT NULL,
  `agent_name` varchar(255) NOT NULL DEFAULT '',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `support_messages`
--

INSERT INTO `support_messages` (`id`, `conversation_id`, `user_id`, `sender`, `body`, `agent_name`, `created_at`) VALUES
('3c913735-3759-468a-a594-c1f079f646a7', 'b49d3eee-a160-40ad-9b2d-4b3d5b541b05', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'agent', 'Agent smoke reply', 'Super Admin', '2026-09-21 12:13:46.758'),
('821e42e0-6d47-4b19-a6d1-f7b415a437eb', '39931834-27b2-4366-b926-656d61878a18', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'user', 'Napa দাম কত?', '', '2026-09-21 15:49:42.761'),
('a52d112a-845e-41a4-a43e-41987784e69d', '39931834-27b2-4366-b926-656d61878a18', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'ai', 'ধন্যবাদ — আমাদের টিম শীঘ্রই জবাব দেবে। জরুরি হলে ১৬৭০০ (২৪/৭) এ কল করুন।', '', '2026-09-21 15:49:42.775'),
('b9677c3c-33c4-4fcf-a05f-a598f40973c7', 'b49d3eee-a160-40ad-9b2d-4b3d5b541b05', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'user', 'Hello from smoke', '', '2026-09-21 12:12:52.688');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `email_verified` datetime(3) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  `image` varchar(512) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password_hash`, `email_verified`, `name`, `image`, `created_at`, `updated_at`) VALUES
('cust-staff-test-001', 'customer@test.local', '$2a$10$abcdefghijklmnopqrstuu', NULL, 'Test Customer', NULL, '2026-09-21 16:43:03.980', '2026-09-21 16:43:03.980'),
('dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'admin@oushodhwala.local', '$2b$10$VNCM6M8JO9RZXiQvwyMtn.Ddjjy061SU3ASyrwfmASHLoF3xN0OfK', NULL, 'Super Admin', NULL, '2026-09-21 10:05:25.638', '2026-09-21 11:45:07.696');

-- --------------------------------------------------------

--
-- Table structure for table `user_favorites`
--

CREATE TABLE `user_favorites` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_recent_medicines`
--

CREATE TABLE `user_recent_medicines` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `product_id` varchar(36) NOT NULL,
  `last_viewed_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_roles`
--

CREATE TABLE `user_roles` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `role` enum('super_admin','admin','erp_manager','support_agent','accountant','pharmacist','rider','user') NOT NULL DEFAULT 'user',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_roles`
--

INSERT INTO `user_roles` (`id`, `user_id`, `role`, `created_at`) VALUES
('693e0085-41e5-4b73-96e3-492ffb82400e', 'dc05c0f8-4c6d-4b0d-9a90-e22516b6262a', 'super_admin', '2026-09-21 10:05:25.649'),
('role-user-cust-001', 'cust-staff-test-001', 'user', '2026-09-21 16:43:03.994');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `api_endpoints`
--
ALTER TABLE `api_endpoints`
  ADD PRIMARY KEY (`id`),
  ADD KEY `api_endpoints_grp_idx` (`grp`);

--
-- Indexes for table `api_integrations`
--
ALTER TABLE `api_integrations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `api_integrations_provider_uidx` (`provider`);

--
-- Indexes for table `api_test_logs`
--
ALTER TABLE `api_test_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `api_test_logs_created_idx` (`created_at`);

--
-- Indexes for table `appointments`
--
ALTER TABLE `appointments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `appointments_user_idx` (`user_id`),
  ADD KEY `appointments_doctor_idx` (`doctor_id`),
  ADD KEY `appointments_scheduled_idx` (`scheduled_at`);

--
-- Indexes for table `appointment_reminders`
--
ALTER TABLE `appointment_reminders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `appointment_reminders_appt_idx` (`appointment_id`),
  ADD KEY `appointment_reminders_status_idx` (`status`);

--
-- Indexes for table `app_settings`
--
ALTER TABLE `app_settings`
  ADD PRIMARY KEY (`key`);

--
-- Indexes for table `branches`
--
ALTER TABLE `branches`
  ADD PRIMARY KEY (`id`),
  ADD KEY `branches_code_idx` (`code`),
  ADD KEY `branches_active_idx` (`active`);

--
-- Indexes for table `campaign_sends`
--
ALTER TABLE `campaign_sends`
  ADD PRIMARY KEY (`id`),
  ADD KEY `campaign_sends_created_idx` (`created_at`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `chart_accounts`
--
ALTER TABLE `chart_accounts`
  ADD PRIMARY KEY (`code`),
  ADD KEY `chart_accounts_kind_idx` (`kind`);

--
-- Indexes for table `consultation_media`
--
ALTER TABLE `consultation_media`
  ADD PRIMARY KEY (`id`),
  ADD KEY `consultation_media_appt_idx` (`appointment_id`);

--
-- Indexes for table `consultation_messages`
--
ALTER TABLE `consultation_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `consultation_messages_appt_idx` (`appointment_id`,`created_at`);

--
-- Indexes for table `consultation_prescriptions`
--
ALTER TABLE `consultation_prescriptions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `consultation_rx_appt_uq` (`appointment_id`);

--
-- Indexes for table `deliveries`
--
ALTER TABLE `deliveries`
  ADD PRIMARY KEY (`id`),
  ADD KEY `deliveries_order_idx` (`order_id`),
  ADD KEY `deliveries_rider_idx` (`rider_id`),
  ADD KEY `deliveries_status_idx` (`status`);

--
-- Indexes for table `delivery_events`
--
ALTER TABLE `delivery_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `delivery_events_delivery_idx` (`delivery_id`,`created_at`);

--
-- Indexes for table `delivery_notifications`
--
ALTER TABLE `delivery_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `delivery_notifications_delivery_idx` (`delivery_id`),
  ADD KEY `delivery_notifications_user_idx` (`user_id`);

--
-- Indexes for table `delivery_zones`
--
ALTER TABLE `delivery_zones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `delivery_zones_active_idx` (`active`),
  ADD KEY `delivery_zones_sort_idx` (`sort_order`);

--
-- Indexes for table `diagnostic_bookings`
--
ALTER TABLE `diagnostic_bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `diag_bookings_user_idx` (`user_id`),
  ADD KEY `diag_bookings_status_idx` (`status`),
  ADD KEY `diag_bookings_no_idx` (`booking_no`);

--
-- Indexes for table `doctors`
--
ALTER TABLE `doctors`
  ADD PRIMARY KEY (`id`),
  ADD KEY `doctors_active_idx` (`active`);

--
-- Indexes for table `doctor_blackouts`
--
ALTER TABLE `doctor_blackouts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `doctor_blackouts_doctor_day_uq` (`doctor_id`,`day`),
  ADD KEY `doctor_blackouts_doctor_idx` (`doctor_id`),
  ADD KEY `doctor_blackouts_day_idx` (`day`);

--
-- Indexes for table `doctor_reviews`
--
ALTER TABLE `doctor_reviews`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `doctor_reviews_appt_uq` (`appointment_id`),
  ADD KEY `doctor_reviews_doctor_idx` (`doctor_id`);

--
-- Indexes for table `erp_audit_log`
--
ALTER TABLE `erp_audit_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `erp_audit_created_idx` (`created_at`);

--
-- Indexes for table `error_logs`
--
ALTER TABLE `error_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `error_logs_created_idx` (`created_at`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `expenses_paid_idx` (`paid_at`);

--
-- Indexes for table `generic_info`
--
ALTER TABLE `generic_info`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `generic_info_key_uidx` (`key`);

--
-- Indexes for table `image_audit_log`
--
ALTER TABLE `image_audit_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `image_audit_log_created_idx` (`created_at`),
  ADD KEY `image_audit_log_product_idx` (`product_id`);

--
-- Indexes for table `image_import_failures`
--
ALTER TABLE `image_import_failures`
  ADD PRIMARY KEY (`id`),
  ADD KEY `image_import_failures_run_idx` (`run_id`),
  ADD KEY `image_import_failures_resolved_idx` (`resolved`);

--
-- Indexes for table `image_import_runs`
--
ALTER TABLE `image_import_runs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `image_import_runs_created_idx` (`created_at`);

--
-- Indexes for table `image_revisions`
--
ALTER TABLE `image_revisions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `image_revisions_status_idx` (`status`,`created_at`),
  ADD KEY `image_revisions_product_idx` (`product_id`);

--
-- Indexes for table `journal_entries`
--
ALTER TABLE `journal_entries`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `journal_entries_no_uidx` (`entry_no`),
  ADD KEY `journal_entries_date_idx` (`entry_date`);

--
-- Indexes for table `journal_lines`
--
ALTER TABLE `journal_lines`
  ADD PRIMARY KEY (`id`),
  ADD KEY `journal_lines_entry_idx` (`entry_id`),
  ADD KEY `journal_lines_account_idx` (`account_code`);

--
-- Indexes for table `lab_tests`
--
ALTER TABLE `lab_tests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `lab_tests_active_idx` (`active`);

--
-- Indexes for table `loyalty_accounts`
--
ALTER TABLE `loyalty_accounts`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `loyalty_transactions`
--
ALTER TABLE `loyalty_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `loyalty_tx_user_idx` (`user_id`);

--
-- Indexes for table `media_assets`
--
ALTER TABLE `media_assets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `media_assets_kind_idx` (`kind`),
  ADD KEY `media_assets_created_idx` (`created_at`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `notifications_user_idx` (`user_id`),
  ADD KEY `notifications_kind_idx` (`kind`),
  ADD KEY `notifications_created_idx` (`created_at`);

--
-- Indexes for table `offers`
--
ALTER TABLE `offers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `orders_user_idx` (`user_id`),
  ADD KEY `orders_status_idx` (`status`),
  ADD KEY `orders_order_no_idx` (`order_no`),
  ADD KEY `orders_public_token_idx` (`public_token`);

--
-- Indexes for table `order_events`
--
ALTER TABLE `order_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_events_order_idx` (`order_id`),
  ADD KEY `order_events_created_idx` (`created_at`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_items_product_id_products_id_fk` (`product_id`),
  ADD KEY `order_items_order_idx` (`order_id`);

--
-- Indexes for table `order_returns`
--
ALTER TABLE `order_returns`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_returns_user_idx` (`user_id`),
  ADD KEY `order_returns_order_idx` (`order_id`),
  ADD KEY `order_returns_status_idx` (`status`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `password_reset_tokens_user_id_users_id_fk` (`user_id`);

--
-- Indexes for table `pos_sales`
--
ALTER TABLE `pos_sales`
  ADD PRIMARY KEY (`id`),
  ADD KEY `pos_sales_invoice_idx` (`invoice_no`),
  ADD KEY `pos_sales_created_idx` (`created_at`);

--
-- Indexes for table `pos_sale_items`
--
ALTER TABLE `pos_sale_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `pos_sale_items_sale_idx` (`sale_id`);

--
-- Indexes for table `prescriptions`
--
ALTER TABLE `prescriptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `prescriptions_user_idx` (`user_id`),
  ADD KEY `prescriptions_status_idx` (`status`);

--
-- Indexes for table `prescription_audit`
--
ALTER TABLE `prescription_audit`
  ADD PRIMARY KEY (`id`),
  ADD KEY `prescription_audit_rx_idx` (`prescription_id`,`created_at`);

--
-- Indexes for table `prescription_shares`
--
ALTER TABLE `prescription_shares`
  ADD PRIMARY KEY (`id`),
  ADD KEY `prescription_shares_token_idx` (`token`),
  ADD KEY `prescription_shares_rx_idx` (`prescription_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `products_category_idx` (`category`),
  ADD KEY `products_generic_idx` (`generic`),
  ADD KEY `products_active_idx` (`active`);

--
-- Indexes for table `product_image_audit`
--
ALTER TABLE `product_image_audit`
  ADD PRIMARY KEY (`product_id`),
  ADD KEY `product_image_audit_status_idx` (`status`);

--
-- Indexes for table `product_image_map`
--
ALTER TABLE `product_image_map`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `product_image_map_product_uidx` (`product_id`);

--
-- Indexes for table `product_reviews`
--
ALTER TABLE `product_reviews`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `product_reviews_product_user_uq` (`product_id`,`user_id`),
  ADD KEY `product_reviews_product_idx` (`product_id`),
  ADD KEY `product_reviews_user_idx` (`user_id`),
  ADD KEY `product_reviews_status_idx` (`status`);

--
-- Indexes for table `profiles`
--
ALTER TABLE `profiles`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `purchase_orders_po_no_idx` (`po_no`),
  ADD KEY `purchase_orders_status_idx` (`status`),
  ADD KEY `purchase_orders_supplier_id_fk` (`supplier_id`);

--
-- Indexes for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `purchase_order_items_po_idx` (`po_id`);

--
-- Indexes for table `refill_reminders`
--
ALTER TABLE `refill_reminders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `refill_reminders_user_product_uidx` (`user_id`,`product_id`),
  ADD KEY `refill_reminders_next_idx` (`next_at`);

--
-- Indexes for table `riders`
--
ALTER TABLE `riders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `riders_active_idx` (`active`);

--
-- Indexes for table `rx_retention`
--
ALTER TABLE `rx_retention`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `service_requests`
--
ALTER TABLE `service_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `service_requests_user_idx` (`user_id`),
  ADD KEY `service_requests_status_idx` (`status`);

--
-- Indexes for table `stock_adjustments`
--
ALTER TABLE `stock_adjustments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `stock_adjustments_no_uidx` (`adj_no`),
  ADD KEY `stock_adjustments_created_idx` (`created_at`);

--
-- Indexes for table `stock_adjustment_items`
--
ALTER TABLE `stock_adjustment_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `stock_adjustment_items_adj_idx` (`adj_id`);

--
-- Indexes for table `stock_alerts`
--
ALTER TABLE `stock_alerts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `stock_alerts_created_idx` (`created_at`);

--
-- Indexes for table `stock_batches`
--
ALTER TABLE `stock_batches`
  ADD PRIMARY KEY (`id`),
  ADD KEY `stock_batches_product_idx` (`product_id`),
  ADD KEY `stock_batches_expiry_idx` (`expiry`);

--
-- Indexes for table `stock_counts`
--
ALTER TABLE `stock_counts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `stock_counts_no_uidx` (`count_no`),
  ADD KEY `stock_counts_status_idx` (`status`);

--
-- Indexes for table `stock_count_items`
--
ALTER TABLE `stock_count_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `stock_count_items_count_idx` (`count_id`);

--
-- Indexes for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `stock_movements_product_idx` (`product_id`);

--
-- Indexes for table `stock_transfers`
--
ALTER TABLE `stock_transfers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `stock_transfers_status_idx` (`status`),
  ADD KEY `stock_transfers_no_idx` (`transfer_no`),
  ADD KEY `stock_transfers_from_fk` (`from_branch_id`),
  ADD KEY `stock_transfers_to_fk` (`to_branch_id`);

--
-- Indexes for table `stock_transfer_items`
--
ALTER TABLE `stock_transfer_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `stock_transfer_items_transfer_idx` (`transfer_id`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `suppliers_name_idx` (`name`);

--
-- Indexes for table `support_conversations`
--
ALTER TABLE `support_conversations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `support_conversations_user_idx` (`user_id`),
  ADD KEY `support_conversations_last_idx` (`last_message_at`);

--
-- Indexes for table `support_messages`
--
ALTER TABLE `support_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `support_messages_conv_idx` (`conversation_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD KEY `users_email_idx` (`email`);

--
-- Indexes for table `user_favorites`
--
ALTER TABLE `user_favorites`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_favorites_user_product_uidx` (`user_id`,`product_id`),
  ADD KEY `user_favorites_user_idx` (`user_id`);

--
-- Indexes for table `user_recent_medicines`
--
ALTER TABLE `user_recent_medicines`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_recent_medicines_user_product_uidx` (`user_id`,`product_id`),
  ADD KEY `user_recent_medicines_user_idx` (`user_id`),
  ADD KEY `user_recent_medicines_viewed_idx` (`last_viewed_at`);

--
-- Indexes for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_roles_user_idx` (`user_id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `appointments`
--
ALTER TABLE `appointments`
  ADD CONSTRAINT `appointments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `deliveries`
--
ALTER TABLE `deliveries`
  ADD CONSTRAINT `deliveries_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `deliveries_rider_id_fk` FOREIGN KEY (`rider_id`) REFERENCES `riders` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `diagnostic_bookings`
--
ALTER TABLE `diagnostic_bookings`
  ADD CONSTRAINT `diagnostic_bookings_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `loyalty_accounts`
--
ALTER TABLE `loyalty_accounts`
  ADD CONSTRAINT `loyalty_accounts_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `loyalty_transactions`
--
ALTER TABLE `loyalty_transactions`
  ADD CONSTRAINT `loyalty_transactions_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION,
  ADD CONSTRAINT `order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Constraints for table `order_returns`
--
ALTER TABLE `order_returns`
  ADD CONSTRAINT `order_returns_order_fk` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `order_returns_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD CONSTRAINT `password_reset_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Constraints for table `pos_sale_items`
--
ALTER TABLE `pos_sale_items`
  ADD CONSTRAINT `pos_sale_items_sale_id_fk` FOREIGN KEY (`sale_id`) REFERENCES `pos_sales` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `prescriptions`
--
ALTER TABLE `prescriptions`
  ADD CONSTRAINT `prescriptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

--
-- Constraints for table `prescription_shares`
--
ALTER TABLE `prescription_shares`
  ADD CONSTRAINT `prescription_shares_prescription_id_fk` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_reviews`
--
ALTER TABLE `product_reviews`
  ADD CONSTRAINT `product_reviews_product_fk` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `product_reviews_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `profiles`
--
ALTER TABLE `profiles`
  ADD CONSTRAINT `profiles_id_users_id_fk` FOREIGN KEY (`id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

--
-- Constraints for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD CONSTRAINT `purchase_orders_supplier_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`);

--
-- Constraints for table `purchase_order_items`
--
ALTER TABLE `purchase_order_items`
  ADD CONSTRAINT `purchase_order_items_po_id_fk` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `service_requests`
--
ALTER TABLE `service_requests`
  ADD CONSTRAINT `service_requests_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD CONSTRAINT `stock_movements_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `stock_transfers`
--
ALTER TABLE `stock_transfers`
  ADD CONSTRAINT `stock_transfers_from_fk` FOREIGN KEY (`from_branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `stock_transfers_to_fk` FOREIGN KEY (`to_branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `stock_transfer_items`
--
ALTER TABLE `stock_transfer_items`
  ADD CONSTRAINT `stock_transfer_items_fk` FOREIGN KEY (`transfer_id`) REFERENCES `stock_transfers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `support_conversations`
--
ALTER TABLE `support_conversations`
  ADD CONSTRAINT `support_conversations_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `support_messages`
--
ALTER TABLE `support_messages`
  ADD CONSTRAINT `support_messages_conversation_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `support_conversations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD CONSTRAINT `user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
